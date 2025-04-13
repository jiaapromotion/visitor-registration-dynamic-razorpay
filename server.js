
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const { google } = require("googleapis");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",  // ✅ your new credentials
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SHEET_ID = "1ZnKm2cma8y9k6WMcT1YG3tqCjqq2VBILDEAaCBcyDtA";

// Cashfree configuration
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg/orders";
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

// AiSensy WhatsApp API config
const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/sendTemplateMessage";
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;

// Helper to send WhatsApp via AiSensy
async function sendWhatsAppMessage(name, phone) {
  try {
    await axios.post(
      AISENSY_API_URL,
      {
        template_name: "event_followup",
        broadcast_name: "QRPass Visitors",
        parameters: { name },
        phone_number: phone,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AISENSY_API_KEY}`,
        },
      }
    );
  } catch (err) {
    console.error("Failed to send WhatsApp:", err.response?.data || err.message);
  }
}

// Payment + Registration
app.post("/create-order", async (req, res) => {
  const { name, email, phone, amount } = req.body;

  try {
    const order = await axios.post(
      CASHFREE_BASE_URL,
      {
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone,
        },
        order_meta: {
          return_url: "https://visitor-registration-dynamic-razorpay.onrender.com/success.html",
        },
      },
      {
        headers: {
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentLink = order.data.payment_link;

    // Store to Google Sheet
    const sheetsClient = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: sheetsClient });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Paid Leads!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[new Date().toLocaleString(), name, email, phone, amount]],
      },
    });

    // Trigger WhatsApp
    await sendWhatsAppMessage(name, phone);

    res.json({ success: true, paymentLink });
  } catch (error) {
    console.error("Error in /create-order:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
