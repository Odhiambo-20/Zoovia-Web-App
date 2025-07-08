const express = require('express');
const Stripe = require('stripe');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not defined in environment variables');
  process.exit(1);
}

// Log the first 10 characters of STRIPE_SECRET_KEY for debugging
console.log('🔍 STRIPE_SECRET_KEY (first 10 chars):', process.env.STRIPE_SECRET_KEY?.substring(0, 10));

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

console.log('✅ Stripe initialized at startup:', {
  exists: !!stripe,
  type: typeof stripe,
  version: stripe._apiVersion || 'default (not specified)',
  charges: !!stripe.charges,
  checkout: !!stripe.checkout,
  stripeProperties: Object.keys(stripe).slice(0, 10).join(', '),
});

// Validation middleware for checkout sessions
const validateCheckoutSession = [
  body('amount').isFloat({ min: 0.50 }).withMessage('Amount must be at least $0.50'),
  body('currency').isIn(['usd', 'eur', 'gbp', 'aud', 'cny', 'egp']).withMessage('Unsupported currency'),
  body('customerName').trim().isLength({ min: 2 }).withMessage('Customer name is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
  body('cartItems').isArray({ min: 1 }).withMessage('Cart items are required'),
];

// Create checkout session route
router.post('/create-checkout-session', authenticateToken, validateCheckoutSession, async (req, res) => {
  console.log('🔍 Received request for /create-checkout-session'); // Debug log
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔍 Validation errors:', errors.array()); // Debug log
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { amount, currency, customerName, customerEmail, description, cartItems, shippingAddress, billingAddress } = req.body;

    console.log('🔍 Checkout session request:', { amount, currency, cartItemsLength: cartItems?.length });

    const orderNumber = `ZOO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    console.log('📝 Generating order:', { orderNumber, amount, currency, userId: req.user.id });

    // Create order in database using direct query
    const orderResult = await db.query`
      INSERT INTO orders (
        user_id, order_number, total_amount, currency, 
        shipping_address, billing_address, notes, 
        status, payment_status, created_at, updated_at
      ) VALUES (
        ${req.user.id}, ${orderNumber}, ${amount}, ${currency.toUpperCase()}, 
        ${shippingAddress ? JSON.stringify(shippingAddress) : null}, 
        ${billingAddress ? JSON.stringify(billingAddress) : null}, 
        ${description || null}, 
        'pending', 'pending', NOW(), NOW()
      ) RETURNING *
    `;

    const order = orderResult[0];
    console.log('✅ Order created:', { orderId: order.id, orderNumber });

    // Create order items using direct query
    const orderItemsInserts = cartItems.map(item => 
      db.query`
        INSERT INTO order_items (
          order_id, pet_id, pet_name, pet_category, 
          pet_breed, quantity, unit_price, total_price, 
          created_at, updated_at
        ) VALUES (
          ${order.id}, ${item.id}, ${item.name}, ${item.category}, 
          ${item.breed || ''}, ${item.quantity || 1}, ${item.price}, 
          ${item.price * (item.quantity || 1)}, NOW(), NOW()
        )
      `
    );

    await Promise.all(orderItemsInserts);
    console.log('✅ Order items created:', cartItems.length);

    // Create line items for Stripe Checkout
    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: `${item.name} - ${item.breed || item.category}`,
          description: `Pet ID: ${item.id}`,
          images: item.images && item.images.length > 0 ? [item.images[0]] : []
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity || 1,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.origin || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/payment/cancel`,
      customer_email: customerEmail,
      client_reference_id: order.id.toString(),
      metadata: {
        orderId: order.id.toString(),
        orderNumber,
        userId: req.user.id.toString(),
        customerName,
        customerEmail,
      },
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'EG', 'CN']
      }
    });

    // Update order with checkout session ID
    await db.query`
      UPDATE orders 
      SET checkout_session_id = ${session.id}, updated_at = NOW()
      WHERE id = ${order.id}
    `;

    // Log the action using direct query
    await db.query`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        new_values, ip_address, user_agent, 
        created_at, updated_at
      ) VALUES (
        ${req.user.id}, 'CHECKOUT_SESSION_CREATED', 'order', ${order.id}, 
        ${JSON.stringify({ orderNumber, amount, currency, sessionId: session.id })}, 
        ${req.ip}, ${req.headers['user-agent']}, 
        NOW(), NOW()
      )
    `;

    console.log('✅ Checkout session created:', session.id);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        orderId: order.id,
        orderNumber,
      },
    });
  } catch (error) {
    console.error('❌ Checkout session creation error:', error.message, error.stack);
    if (error.type === 'StripeAuthenticationError') {
      return res.status(500).json({ success: false, error: 'Authentication with payment service failed' });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Verify payment success
router.get('/verify-session/:sessionId', authenticateToken, async (req, res) => {
  console.log('🔍 Received request for /verify-session/:sessionId'); // Debug log
  try {
    const { sessionId } = req.params;

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Find the order
    const order = await db.query`
      SELECT * FROM orders 
      WHERE checkout_session_id = ${sessionId} 
      AND user_id = ${req.user.id} 
      LIMIT 1
    `;

    if (!order[0]) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Update order status based on payment status
    let orderStatus = 'pending';
    let paymentStatus = 'pending';

    if (session.payment_status === 'paid') {
      orderStatus = 'confirmed';
      paymentStatus = 'succeeded';
    } else if (session.payment_status === 'unpaid') {
      orderStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    // Update order status using direct query
    await db.query`
      UPDATE orders 
      SET status = ${orderStatus}, payment_status = ${paymentStatus}, updated_at = NOW()
      WHERE id = ${order[0].id}
    `;

    // Create payment record if paid
    if (session.payment_status === 'paid') {
      await db.query`
        INSERT INTO payments (
          order_id, user_id, stripe_checkout_session_id, amount, currency, 
          payment_method_type, billing_email, status, processed_at, 
          created_at, updated_at
        ) VALUES (
          ${order[0].id}, ${req.user.id}, ${sessionId}, ${order[0].total_amount}, 
          ${order[0].currency}, 'card', ${session.customer_email}, 'succeeded', 
          NOW(), NOW(), NOW()
        )
      `;
    }

    // Log the verification
    await db.query`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, 
        new_values, ip_address, user_agent, 
        created_at, updated_at
      ) VALUES (
        ${req.user.id}, 'PAYMENT_VERIFIED', 'order', ${order[0].id}, 
        ${JSON.stringify({ 
          sessionId, 
          paymentStatus: session.payment_status,
          orderStatus,
          amount: order[0].total_amount 
        })}, 
        ${req.ip}, ${req.headers['user-agent']}, 
        NOW(), NOW()
      )
    `;

    res.json({
      success: true,
      data: {
        orderId: order[0].id,
        orderNumber: order[0].order_number,
        status: orderStatus,
        paymentStatus,
        amount: order[0].total_amount,
        currency: order[0].currency,
        customerEmail: session.customer_email,
      },
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
});

// Direct charge creation (legacy method)
router.post('/create-charge', authenticateToken, [
  body('amount').isFloat({ min: 0.50 }).withMessage('Amount must be at least $0.50'),
  body('currency').isIn(['usd', 'eur', 'gbp', 'aud', 'cny', 'egp']).withMessage('Unsupported currency'),
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  body('customerEmail').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  console.log('🔍 Received request for /create-charge'); // Debug log
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('🔍 Validation errors:', errors.array()); // Debug log
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { amount, currency, paymentMethodId, customerEmail, description } = req.body;

    console.log('🔍 Direct charge request:', { amount, currency, paymentMethodId });

    // Create payment intent instead of direct charge for better security
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethodId,
      description: description || `Zoovio Direct Payment`,
      receipt_email: customerEmail,
      metadata: {
        userId: req.user.id.toString(),
        customerEmail,
      },
      confirm: true,
      return_url: `${req.headers.origin || 'http://localhost:5173'}/payment/return`,
    });

    console.log('✅ Payment intent created:', paymentIntent.id);

    // Create payment record
    await db.query`
      INSERT INTO payments (
        user_id, stripe_payment_intent_id, amount, currency, 
        payment_method_type, billing_email, status, processed_at, 
        created_at, updated_at
      ) VALUES (
        ${req.user.id}, ${paymentIntent.id}, ${amount}, ${currency.toUpperCase()}, 
        'card', ${customerEmail}, ${paymentIntent.status === 'succeeded' ? 'succeeded' : 'failed'}, 
        NOW(), NOW(), NOW()
      ) RETURNING *
    `;

    res.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: amount,
        currency: currency,
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    console.error('❌ Direct charge error:', error);
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  console.log('🔍 Received request for /history'); // Debug log
  try {
    const payments = await db.query`
      SELECT p.id, p.amount, p.currency, p.status, p.card_last_four, p.card_brand, p.processed_at, p.created_at,
             o.order_number, o.status as order_status
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.user_id = ${req.user.id}
      ORDER BY p.created_at DESC
    `;
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('❌ Payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
  }
});

// Test Stripe configuration
router.get('/test-stripe', (req, res) => {
  console.log('🔍 Testing Stripe configuration...');
  try {
    const testResult = {
      stripeExists: !!stripe,
      stripeType: typeof stripe,
      stripeVersion: stripe._apiVersion || 'default (not specified)',
      checkoutExists: !!stripe.checkout,
      chargesExists: !!stripe.charges,
      paymentIntentsExists: !!stripe.paymentIntents,
      stripeProperties: Object.keys(stripe).slice(0, 10).join(', '),
    };
    console.log('🔍 Test result:', testResult);
    res.json(testResult);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.status(500).json({ error: 'Test failed', message: error.message });
  }
});

// Test Stripe checkout session creation
router.get('/test-checkout', async (req, res) => { // Changed to async function
  console.log('🔍 Testing Stripe checkout session creation...');
  try {
    const testSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Test Pet',
          },
          unit_amount: 100, // $1.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });
    console.log('✅ Test checkout session created:', testSession.id);
    res.json({ 
      success: true, 
      message: 'Stripe checkout is working', 
      testSessionId: testSession.id 
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stripe webhook for checkout sessions
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('🔍 Received webhook request'); // Debug log
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET is not defined');
      return res.status(500).send('Webhook secret not configured');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ Checkout session completed:', session.id);
        
        // Update order status
        await db.query`
          UPDATE orders 
          SET payment_status = 'succeeded', status = 'confirmed', updated_at = NOW()
          WHERE checkout_session_id = ${session.id}
        `;

        // Create payment record
        const order = await db.query`
          SELECT * FROM orders 
          WHERE checkout_session_id = ${session.id} 
          LIMIT 1
        `;

        if (order[0]) {
          await db.query`
            INSERT INTO payments (
              order_id, user_id, stripe_checkout_session_id, amount, currency, 
              payment_method_type, billing_email, status, processed_at, 
              created_at, updated_at
            ) VALUES (
              ${order[0].id}, ${order[0].user_id}, ${session.id}, ${order[0].total_amount}, 
              ${order[0].currency}, 'card', ${session.customer_email}, 'succeeded', 
              NOW(), NOW(), NOW()
            )
          `;
        }
        break;

      case 'checkout.session.expired':
        const expiredSession = event.data.object;
        console.log('❌ Checkout session expired:', expiredSession.id);
        
        await db.query`
          UPDATE orders 
          SET payment_status = 'failed', status = 'cancelled', updated_at = NOW()
          WHERE checkout_session_id = ${expiredSession.id}
        `;
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('✅ Payment intent succeeded:', paymentIntent.id);
        
        // Update payment record
        await db.query`
          UPDATE payments 
          SET status = 'succeeded', processed_at = NOW(), updated_at = NOW()
          WHERE stripe_payment_intent_id = ${paymentIntent.id}
        `;
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log('❌ Payment intent failed:', failedPaymentIntent.id);
        
        // Update payment record
        await db.query`
          UPDATE payments 
          SET status = 'failed', updated_at = NOW()
          WHERE stripe_payment_intent_id = ${failedPaymentIntent.id}
        `;
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

module.exports = router;