// utils/stripe.js
const Stripe = require('stripe'); // ✅ No .default in CommonJS for v18+

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not defined');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10', // ✅ Set a valid API version
});

console.log('✅ Stripe initialized:', {
  apiVersion: stripe.getApiField('version'),
  paymentIntentsExists: !!stripe.paymentIntents,
  createMethodExists: typeof stripe.paymentIntents?.create === 'function',
});

module.exports = stripe;
