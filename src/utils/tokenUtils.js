// backend/utils/tokenUtils.js
import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object containing id and role
 * @param {string} expiresIn - Token expiration time (default: '1d')
 * @returns {string} - JWT token
 */
export const generateToken = (user, expiresIn = '1d') => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null if invalid
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
};