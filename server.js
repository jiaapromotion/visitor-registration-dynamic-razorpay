const express = require('express');
const bodyParser = require('body-parser');
const { Twilio } = require('twilio');
require('dotenv').config();

const app = express();
const client = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/confirm', async (req, res) => {
  const { razorpay_payment_id, name, phone } = req.body;

  try {
    await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:' + phone,
      body: `Hi ${name}, your payment (ID: ${razorpay_payment_id}) was successful! 🎉 You're registered for the event.`
    });
    res.status(200).send("WhatsApp confirmation sent.");
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    res.status(500).send("Failed to send WhatsApp.");
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
