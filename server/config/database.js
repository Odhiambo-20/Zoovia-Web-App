const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL);

// Test database connection
const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected successfully:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Database helper functions
const db = {
  // Execute raw SQL query
  query: async (query, params = []) => {
    try {
      return await sql(query, ...params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // User operations
  users: {
    create: async (userData) => {
      const { full_name, email, password_hash, phone, address, city, country, postal_code } = userData;
      return await sql`
        INSERT INTO users (full_name, email, password_hash, phone, address, city, country, postal_code)
        VALUES (${full_name}, ${email}, ${password_hash}, ${phone}, ${address}, ${city}, ${country}, ${postal_code})
        RETURNING id, full_name, email, created_at
      `;
    },

    findByEmail: async (email) => {
      const result = await sql`
        SELECT * FROM users WHERE email = ${email} LIMIT 1
      `;
      return result[0] || null;
    },

    findById: async (id) => {
      const result = await sql`
        SELECT id, full_name, email, phone, address, city, country, postal_code, is_verified, created_at
        FROM users WHERE id = ${id} LIMIT 1
      `;
      return result[0] || null;
    },

    update: async (id, updateData) => {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      if (fields.length === 0) return null;
      
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
      
      return await sql(query, [id, ...values]);
    }
  },

  // Order operations
  orders: {
    create: async (orderData) => {
      const { user_id, order_number, total_amount, currency, shipping_address, billing_address, notes } = orderData;
      return await sql`
        INSERT INTO orders (user_id, order_number, total_amount, currency, shipping_address, billing_address, notes)
        VALUES (${user_id}, ${order_number}, ${total_amount}, ${currency}, ${shipping_address}, ${billing_address}, ${notes})
        RETURNING *
      `;
    },

    findById: async (id) => {
      const result = await sql`
        SELECT * FROM orders WHERE id = ${id} LIMIT 1
      `;
      return result[0] || null;
    },

    findByUserId: async (userId) => {
      return await sql`
        SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
    },

    updateStatus: async (id, status, payment_status = null) => {
      if (payment_status) {
        return await sql`
          UPDATE orders 
          SET status = ${status}, payment_status = ${payment_status}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        return await sql`
          UPDATE orders 
          SET status = ${status}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      }
    }
  },

  // Order items operations
  orderItems: {
    create: async (orderItemsData) => {
      const values = orderItemsData.map(item => 
        `('${item.order_id}', '${item.pet_id}', '${item.pet_name}', '${item.pet_category}', '${item.pet_breed || ''}', ${item.quantity}, ${item.unit_price}, ${item.total_price})`
      ).join(', ');
      
      const query = `
        INSERT INTO order_items (order_id, pet_id, pet_name, pet_category, pet_breed, quantity, unit_price, total_price)
        VALUES ${values}
        RETURNING *
      `;
      
      return await sql(query);
    },

    findByOrderId: async (orderId) => {
      return await sql`
        SELECT * FROM order_items WHERE order_id = ${orderId}
      `;
    }
  },

  // Payment operations
  payments: {
    create: async (paymentData) => {
      const {
        order_id, user_id, stripe_payment_intent_id, stripe_payment_method_id,
        amount, currency, payment_method_type, card_last_four, card_brand,
        cardholder_name, billing_email
      } = paymentData;
      
      return await sql`
        INSERT INTO payments (
          order_id, user_id, stripe_payment_intent_id, stripe_payment_method_id,
          amount, currency, payment_method_type, card_last_four, card_brand,
          cardholder_name, billing_email
        )
        VALUES (
          ${order_id}, ${user_id}, ${stripe_payment_intent_id}, ${stripe_payment_method_id},
          ${amount}, ${currency}, ${payment_method_type}, ${card_last_four}, ${card_brand},
          ${cardholder_name}, ${billing_email}
        )
        RETURNING *
      `;
    },

    updateStatus: async (stripe_payment_intent_id, status, failure_reason = null) => {
      const processed_at = status === 'succeeded' ? new Date() : null;
      
      return await sql`
        UPDATE payments 
        SET status = ${status}, 
            failure_reason = ${failure_reason},
            processed_at = ${processed_at},
            updated_at = NOW()
        WHERE stripe_payment_intent_id = ${stripe_payment_intent_id}
        RETURNING *
      `;
    },

    findByIntentId: async (stripe_payment_intent_id) => {
      const result = await sql`
        SELECT * FROM payments WHERE stripe_payment_intent_id = ${stripe_payment_intent_id} LIMIT 1
      `;
      return result[0] || null;
    }
  },

  // Session operations
  sessions: {
    create: async (sessionData) => {
      const { user_id, token_hash, expires_at, user_agent, ip_address } = sessionData;
      return await sql`
        INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES (${user_id}, ${token_hash}, ${expires_at}, ${user_agent}, ${ip_address})
        RETURNING *
      `;
    },

    findByToken: async (token_hash) => {
      const result = await sql`
        SELECT * FROM user_sessions 
        WHERE token_hash = ${token_hash} AND is_active = true AND expires_at > NOW()
        LIMIT 1
      `;
      return result[0] || null;
    },

    deactivate: async (token_hash) => {
      return await sql`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE token_hash = ${token_hash}
      `;
    }
  },

  // Audit log operations
  auditLog: {
    create: async (logData) => {
      const { user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent } = logData;
      return await sql`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        VALUES (${user_id}, ${action}, ${entity_type}, ${entity_id}, ${old_values}, ${new_values}, ${ip_address}, ${user_agent})
        RETURNING *
      `;
    }
  }
};

module.exports = { db, testConnection };