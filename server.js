
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/create-order', (req, res) => {
    const { name, email, phone, amount } = req.body;

    // Return dummy Cashfree test payment link
    const paymentLink = `https://test.cashfree.com/mock-payment-link?name=${encodeURIComponent(name)}&amount=${amount}`;

    res.json({
        success: true,
        paymentLink: paymentLink
    });
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
