
// Cashfree Live Integration (Mocked for Example)
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/create-order', (req, res) => {
    // Mock order creation
    res.json({
        success: true,
        payment_url: "https://test.cashfree.com/mock-payment"
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
