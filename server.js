
const express = require('express');
const bodyParser = require('body-parser');
const { Twilio } = require('twilio');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(express.static('public'));
app.use(bodyParser.json());

async function generateTicketPDF(name, phone, amount, paymentId) {
  const fileName = `ticket-${paymentId}.pdf`;
  const filePath = path.join(__dirname, 'public', fileName);
  const doc = new PDFDocument({ size: 'A5', layout: 'landscape' });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fdf6f0');

  // Logo
  const logoPath = path.join(__dirname, 'public', 'being-puneri-logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 30, 30, { width: 120 });
  }

  doc.fillColor('#333').fontSize(24).text('Being Puneri Flea', 170, 40, { align: 'left' });
  doc.fontSize(16).fillColor('#555').text('Official Entry Ticket', 170, 70);

  // Ticket Info
  doc.moveDown(2);
  doc.fontSize(14).fillColor('#000');
  doc.text(`👤 Name: ${name}`);
  doc.text(`📞 Phone: ${phone}`);
  doc.text(`💳 Payment ID: ${paymentId}`);
  doc.text(`💰 Amount Paid: ₹${amount}`);
  doc.moveDown();

  // QR Data
  const qrData = `Name: ${name}\nPhone: ${phone}\nPayment ID: ${paymentId}\nAmount: ₹${amount}`;
  const qrImage = await QRCode.toDataURL(qrData);
  doc.image(qrImage, doc.page.width - 150, doc.page.height - 150, { width: 100 });

  // Footer
  doc.moveTo(30, doc.page.height - 80).lineTo(doc.page.width - 30, doc.page.height - 80).stroke('#ccc');
  doc.fontSize(12).fillColor('#555').text('Thank you for registering! Show this ticket at entry.', 30, doc.page.height - 60, {
    align: 'center'
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve('/' + fileName));
    stream.on('error', reject);
  });
}

app.post('/confirm', async (req, res) => {
  const { razorpay_payment_id, name, phone, amount } = req.body;

  console.log("📩 Ticket details:", { name, phone, amount });

  try {
    const pdfPath = await generateTicketPDF(name, phone, amount, razorpay_payment_id);
    const publicUrl = 'https://visitor-registration-dynamic-razorpay.onrender.com' + pdfPath;

    await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:' + phone,
      body: `Hi ${name}, your ticket for Being Puneri Flea is ready 🎉 Scan QR for details.`,
      mediaUrl: [publicUrl]
    });

    res.status(200).send("Ticket with QR sent via WhatsApp.");
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Failed to send ticket.");
  }
});

app.listen(3000, () => {
  console.log('🚀 Server with QR running at http://localhost:3000');
});
