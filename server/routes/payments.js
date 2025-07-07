const express = require('express');
const Stripe = require('stripe');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Validation rules
const paymentIntentValidation = [
  body('amount')
    .isFloat({ min: 0.50 })
    .withMessage('Amount must be at least 0.50'),
  body('currency')
    .isIn(['usd', 'eur', 'gbp', 'aud', 'cny', 'egp'])
    .withMessage('Currency not supported'),
  body('customerName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Customer name is required'),
  body('customerEmail')
    .isEmail()
    .withMessage('Valid email is required'),
  body('cartItems')
    .isArray({ min: 1 })
    .withMessage('Cart items are required')
];

// Create payment intent
router.post('/create-payment-intent', authenticateToken, paymentIntentValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { amount, currency, customerName, customerEmail, description, cartItems, shippingAddress, billingAddress } = req.body;

    // Generate unique order number
    const orderNumber = `ZOO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order in database first
    const order = await db.orders.create({
      user_id: req.user.id,
      order_number: orderNumber,
      total_amount: amount,
      currency: currency.toUpperCase(),
      shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
      billing_address: billingAddress ? JSON.stringify(billingAddress) : null,
      notes: description || null
    });

    // Create order items
    const orderItemsData = cartItems.map(item => ({
      order_id: order[0].id,
      pet_id: item.id,
      pet_name: item.name,
      pet_category: item.category,
      pet_breed: item.breed || '',
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }));

    await db.orderItems.create(orderItemsData);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description: description || `Zoovio Pet Store - Order ${orderNumber}`,
      metadata: {
        orderId: order[0].id,
        orderNumber: orderNumber,
        userId: req.user.id,
        customerName,
        customerEmail
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment intent ID
    await db.orders.updateStatus(order[0].id, 'confirmed', 'processing');
    await db.query`
      UPDATE orders 
      SET payment_intent_id = ${paymentIntent.id}
      WHERE id = ${order[0].id}
    `;

    // Log payment intent creation
    await db.auditLog.create({
      user_id: req.user.id,
      action: 'PAYMENT_INTENT_CREATED',
      entity_type: 'order',
      entity_id: order[0].id,
      new_values: JSON.stringify({
        orderNumber,
        amount,
        currency,
        paymentIntentId: paymentIntent.id
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order[0].id,
        orderNumber: orderNumber
      }
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticateToken, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { paymentIntentId, paymentMethodId, cardDetails } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        error: 'Payment intent not found'
      });
    }

    // Find order by payment intent ID
    const order = await db.query`
      SELECT * FROM orders WHERE payment_intent_id = ${paymentIntentId} LIMIT 1
    `;

    if (!order[0]) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Create payment record
    const paymentData = {
      order_id: order[0].id,
      user_id: req.user.id,
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_method_id: paymentMethodId,
      amount: order[0].total_amount,
      currency: order[0].currency,
      payment_method_type: 'card',
      card_last_four: cardDetails?.last4 || null,
      card_brand: cardDetails?.brand || null,
      cardholder_name: cardDetails?.cardholderName || null,
      billing_email: req.user.email
    };

    const payment = await db.payments.create(paymentData);

    // Update payment status based on Stripe status
    let orderStatus = 'processing';
    let paymentStatus = 'processing';

    if (paymentIntent.status === 'succeeded') {
      orderStatus = 'confirmed';
      paymentStatus = 'succeeded';
      await db.payments.updateStatus(paymentIntentId, 'succeeded');
    } else if (paymentIntent.status === 'requires_action') {
      paymentStatus = 'requires_action';
    } else if (paymentIntent.status === 'payment_failed') {
      orderStatus = 'cancelled';
      paymentStatus = 'failed';
      await db.payments.updateStatus(paymentIntentId, 'failed', 'Payment failed');
    }

    // Update order status
    await db.orders.updateStatus(order[0].id, orderStatus, paymentStatus);

    // Log payment confirmation
    await db.auditLog.create({
      user_id: req.user.id,
      action: 'PAYMENT_CONFIRMED',
      entity_type: 'payment',
      entity_id: payment[0].id,
      new_values: JSON.stringify({
        paymentIntentId,
        status: paymentStatus,
        amount: order[0].total_amount
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    res.json({
      success: true,
      data: {
        paymentId: payment[0].id,
        orderId: order[0].id,
        orderNumber: order[0].order_number,
        status: paymentStatus,
        amount: order[0].total_amount,
        currency: order[0].currency
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const payments = await db.query`
      SELECT 
        p.id,
        p.amount,
        p.currency,
        p.status,
        p.card_last_four,
        p.card_brand,
        p.processed_at,
        p.created_at,
        o.order_number,
        o.status as order_status
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.user_id = ${req.user.id}
      ORDER BY p.created_at DESC
    `;

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await db.payments.updateStatus(paymentIntent.id, 'succeeded');
        await db.query`
          UPDATE orders 
          SET payment_status = 'succeeded', status = 'processing'
          WHERE payment_intent_id = ${paymentIntent.id}
        `;
        console.log('Payment succeeded:', paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await db.payments.updateStatus(failedPayment.id, 'failed', failedPayment.last_payment_error?.message);
        await db.query`
          UPDATE orders 
          SET payment_status = 'failed', status = 'cancelled'
          WHERE payment_intent_id = ${failedPayment.id}
        `;
        console.log('Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

module.exports = router;