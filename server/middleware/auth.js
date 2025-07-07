const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Hash token for database storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenHash = hashToken(token);

    // Check if session exists and is active
    const session = await db.sessions.findByToken(tokenHash);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Get user data
    const user = await db.users.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user data to request
    req.user = user;
    req.sessionId = session.id;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db.users.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Create session
const createSession = async (userId, userAgent, ipAddress) => {
  try {
    const token = generateToken(userId);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.sessions.create({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress
    });

    return token;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
};

// Logout (deactivate session)
const logout = async (token) => {
  try {
    const tokenHash = hashToken(token);
    await db.sessions.deactivate(tokenHash);
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  hashToken,
  createSession,
  logout
};