const express = require('express');
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orders = await db.orders.findByUserId(req.user.id);
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.orderItems.findByOrderId(order.id);
        return {
          ...order,
          items
        };
      })
    );

    res.json({
      success: true,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// Get specific order by ID
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await db.orders.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get order items
    const items = await db.orderItems.findByOrderId(orderId);
    
    // Get payment information
    const payment = await db.query`
      SELECT * FROM payments WHERE order_id = ${orderId} LIMIT 1
    `;

    res.json({
      success: true,
      data: {
        ...order,
        items,
        payment: payment[0] || null
      }
    });

  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order'
    });
  }
});

// Update order status (admin only - for future implementation)
router.patch('/:orderId/status', authenticateToken, async (req, res) => {
  try {
    // This would typically require admin authentication
    // For now, we'll allow users to cancel their own orders
    
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await db.orders.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Only allow cancellation if order is not yet shipped
    if (status === 'cancelled' && ['pending', 'confirmed', 'processing'].includes(order.status)) {
      const updatedOrder = await db.orders.updateStatus(orderId, 'cancelled', 'cancelled');
      
      // Log order cancellation
      await db.auditLog.create({
        user_id: req.user.id,
        action: 'ORDER_CANCELLED',
        entity_type: 'order',
        entity_id: orderId,
        old_values: JSON.stringify({ status: order.status }),
        new_values: JSON.stringify({ status: 'cancelled' }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: updatedOrder[0]
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Cannot update order status'
      });
    }

  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

module.exports = router;