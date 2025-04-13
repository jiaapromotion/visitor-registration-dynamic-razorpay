
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Google Sheets setup
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const SHEET_ID = "1ZnKm2cma8y9k6WMcT1YG3tqCjqq2VBILDEAaCBcyDtA";

// AiSensy API details
const AISENSY_API_URL = "https://backend.aisensy.com/campaign/t1/api/sendTemplateMessage";
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;

// Cashfree
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg/orders";

// WhatsApp message via AiSensy
async function sendWhatsAppMessage(name, phone) {
  const payload = {
    template_name: "followup_buttons",
    broadcast_name: "QRPass Retargeting",
    parameters: {
      name: name
    },
    buttons: [
      { type: "quick_reply", reply: { id: "interested", title: "Interested" }},
      { type: "quick_reply", reply: { id: "not_interested", title: "Not Interested" }}
    ],
    phone_number: phone
  };

  try {
    const res = await axios.post(AISENSY_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${AISENSY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ WhatsApp sent:", res.data);
  } catch (err) {
    console.error("❌ WhatsApp error:", err.response?.data || err.message);
  }
}

// POST /pay — register + Cashfree + Sheet + WhatsApp
app.post("/pay", async (req, res) => {
  const { name, email, phone, amount } = req.body;

  try {
    // Cashfree Payment Link
    const orderRes = await axios.post(
      CASHFREE_BASE_URL,
      {
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: phone,
          customer_email: email,
          customer_phone: phone
        },
        order_meta: {
          return_url: "https://visitor-registration-dynamic-razorpay.onrender.com/success.html"
        }
      },
      {
        headers: {
          "x-client-id": CASHFREE_CLIENT_ID,
          "x-client-secret": CASHFREE_CLIENT_SECRET,
          "Content-Type": "application/json"
        }
      }
    );

    const paymentLink = orderRes.data.payment_link;

    // Google Sheets append
    const sheetsClient = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: sheetsClient });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Paid Leads!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[new Date().toLocaleString(), name, email, phone, amount]]
      }
    });

    // Send WhatsApp message
    await sendWhatsAppMessage(name, phone);

    res.json({ paymentLink });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
