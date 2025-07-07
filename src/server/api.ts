// Mock API endpoint for creating payment intents
// In a real application, this would be a backend API endpoint

import Stripe from 'stripe';

// This would typically be in your backend server
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const createPaymentIntentAPI = async (req: any, res: any) => {
  try {
    const { amount, currency, customerName, customerEmail, description } = req.body;

    // Validate required fields
    if (!amount || !currency || !customerName || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: amount, currency, customerName, customerEmail'
      });
    }

    // Check if currency is supported
    const supportedCurrencies = ['usd', 'eur', 'gbp', 'aud', 'cny', 'egp'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      return res.status(400).json({
        error: 'Currency not supported'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in smallest currency unit (cents)
      currency: currency.toLowerCase(),
      description: description || 'Zoovio Pet Store Purchase',
      metadata: {
        customerName,
        customerEmail,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: 'Failed to create payment intent'
    });
  }
};