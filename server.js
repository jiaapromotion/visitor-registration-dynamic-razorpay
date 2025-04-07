
const express = require('express');
const bodyParser = require('body-parser');
const { Twilio } = require('twilio');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(express.static('public'));
app.use(bodyParser.json());

function generateTicketPDF(name, phone, amount, paymentId) {
  return new Promise((resolve, reject) => {
    const fileName = `ticket-${paymentId}.pdf`;
    const filePath = path.join(__dirname, 'public', fileName); // Save in /public
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text("🎟️ Event Ticket", { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${name}`);
    doc.text(`Phone: ${phone}`);
    doc.text(`Payment ID: ${paymentId}`);
    doc.text(`Amount Paid: ₹${amount}`);
    doc.moveDown();
    doc.text("✅ Thank you for registering!", { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve('/' + fileName)); // Return path relative to public
    stream.on('error', reject);
  });
}

app.post('/confirm', async (req, res) => {
  const { razorpay_payment_id, name, phone } = req.body;

  try {
    const amount = "50"; // Or make dynamic

    const pdfPath = await generateTicketPDF(name, phone, amount, razorpay_payment_id);
    const publicUrl = 'https://visitor-registration-dynamic-razorpay.onrender.com' + pdfPath;

    await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:' + phone,
      body: `Hi ${name}, your payment was successful! 🎉 Here is your ticket.`,
      mediaUrl: [publicUrl]
    });

    res.status(200).send("WhatsApp confirmation with ticket sent.");
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    res.status(500).send("Failed to send WhatsApp with PDF.");
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
