// config/database.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

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

const db = {
  query: sql,

  // User operations
  users: {
    create: async (userData) => {
      const { full_name, email, password_hash, phone, address, city, country, postal_code } = userData;
      try {
        const result = await sql`
          INSERT INTO users (full_name, email, password_hash, phone, address, city, country, postal_code)
          VALUES (${full_name}, ${email}, ${password_hash}, ${phone}, ${address}, ${city}, ${country}, ${postal_code})
          RETURNING id, full_name, email, created_at
        `;
        return result;
      } catch (error) {
        console.error('User creation error:', error);
        throw error;
      }
    },

    findByEmail: async (email) => {
      try {
        const result = await sql`
          SELECT * FROM users WHERE email = ${email} LIMIT 1
        `;
        return result[0] || null;
      } catch (error) {
        console.error('Find user error:', error);
        throw error;
      }
    },

    findById: async (id) => {
      try {
        const result = await sql`
          SELECT id, full_name, email, phone, address, city, country, postal_code, is_verified, created_at
          FROM users WHERE id = ${id} LIMIT 1
        `;
        return result[0] || null;
      } catch (error) {
        console.error('Find user error:', error);
        throw error;
      }
    },
  },

  // Session operations
  sessions: {
    create: async (sessionData) => {
      const { user_id, token_hash, expires_at, user_agent, ip_address } = sessionData;
      try {
        const result = await sql`
          INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
          VALUES (${user_id}, ${token_hash}, ${expires_at}, ${user_agent}, ${ip_address})
          RETURNING *
        `;
        return result;
      } catch (error) {
        console.error('Session creation error:', error);
        throw error;
      }
    },

    findByToken: async (token_hash) => {
      try {
        const result = await sql`
          SELECT * FROM user_sessions 
          WHERE token_hash = ${token_hash} AND is_active = true AND expires_at > NOW()
          LIMIT 1
        `;
        return result[0] || null;
      } catch (error) {
        console.error('Find session error:', error);
        throw error;
      }
    },

    deactivate: async (token_hash) => {
      try {
        await sql`
          UPDATE user_sessions 
          SET is_active = false 
          WHERE token_hash = ${token_hash}
        `;
        return true;
      } catch (error) {
        console.error('Session deactivation error:', error);
        throw error;
      }
    },
  },

  // Audit log operations
  auditLog: {
    create: async (logData) => {
      const { user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent } = logData;
      try {
        const result = await sql`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
          VALUES (${user_id}, ${action}, ${entity_type}, ${entity_id}, ${old_values}, ${new_values}, ${ip_address}, ${user_agent})
          RETURNING *
        `;
        return result;
      } catch (error) {
        console.error('Audit log creation error:', error);
        throw error;
      }
    }
  }
};

module.exports = { db, testConnection };