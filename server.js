
const express = require('express');
const bodyParser = require('body-parser');
const { Twilio } = require('twilio');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(express.static('public'));
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter is ready");
  }
});

app.post('/admin-login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.send('ok');
  } else {
    res.status(401).send('unauthorized');
  }
});

function saveRegistration(data) {
  const dataPath = path.join(__dirname, 'data');
  const filePath = path.join(dataPath, 'registrations.json');
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
  let existing = [];
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath));
  }
  existing.push(data);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
}

app.get('/admin/data', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'registrations.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } else {
    res.json([]);
  }
});

async function generateTicketPDF(name, phone, amount, paymentId) {
  const fileName = `ticket-${paymentId}.pdf`;
  const filePath = path.join(__dirname, 'public', fileName);
  const doc = new PDFDocument({ size: 'A5', layout: 'landscape' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fdf6f0');
  const logoPath = path.join(__dirname, 'public', 'being-puneri-logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 30, { width: 120 });
  }

  doc.fillColor('#333').fontSize(24).text('Being Puneri Flea', 170, 40, { align: 'left' });
  doc.fontSize(16).fillColor('#555').text('Official Entry Ticket', 170, 70);
  doc.moveDown(2);
  doc.fontSize(14).fillColor('#000');
  doc.text(`👤 Name: ${name}`);
  doc.text(`📞 Phone: ${phone}`);
  doc.text(`💳 Payment ID: ${paymentId}`);
  doc.text(`💰 Amount Paid: ₹${amount}`);
  doc.moveDown();

  const qrData = `Name: ${name}\nPhone: ${phone}\nPayment ID: ${paymentId}\nAmount: ₹${amount}`;
  const qrImage = await QRCode.toDataURL(qrData);
  doc.image(qrImage, doc.page.width - 150, doc.page.height - 150, { width: 100 });

  doc.moveTo(30, doc.page.height - 80).lineTo(doc.page.width - 30, doc.page.height - 80).stroke('#ccc');
  doc.fontSize(12).fillColor('#555').text('Thank you for registering! Show this ticket at entry.', 30, doc.page.height - 60, {
    align: 'center'
  });

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve({ filePath, publicPath: '/' + fileName }));
    stream.on('error', reject);
  });
}

app.post('/confirm', async (req, res) => {
  console.log("📨 Incoming confirm data:", req.body);
  const { razorpay_payment_id, name, phone, email, amount } = req.body;

  try {
    const { filePath, publicPath } = await generateTicketPDF(name, phone, amount, razorpay_payment_id);
    const fullUrl = 'https://visitor-registration-dynamic-razorpay.onrender.com' + publicPath;

    saveRegistration({
      name,
      phone,
      email,
      amount,
      paymentId: razorpay_payment_id,
      time: new Date().toISOString()
    });

    await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:' + phone,
      body: `Hi ${name}, your ticket for Being Puneri Flea is ready 🎉 Scan QR for details.`,
      mediaUrl: [fullUrl]
    });

    if (email) {
      console.log("📩 Sending email to:", email);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Being Puneri Flea Ticket 🎟️',
        text: `Hi ${name},\n\nThank you for your registration. Please find your ticket attached.\n\nRegards,\nBeing Puneri Team`,
        attachments: [{
          filename: `ticket-${razorpay_payment_id}.pdf`,
          path: filePath
        }]
      });
      console.log("✅ Email sent successfully to:", email);
    }

    res.status(200).send("Ticket sent via WhatsApp and Email.");
  } catch (error) {
    console.error("❌ Error sending ticket:", error);
    res.status(500).send("Failed to send ticket.");
  }
});

app.listen(3000, () => {
  console.log('🚀 Server with email + full debug running at http://localhost:3000');
});
