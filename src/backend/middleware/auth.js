// ==========================================
// © bighosting by bigmanjtech™
// Authentication Middleware
// JWT Verification & User Authorization
// ==========================================

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

// ==========================================
// Authenticate - Verify JWT Token
// ==========================================

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
        });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }
      throw error;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        suspensionReason: true,
        pterodactylUserId: true,
        pterodactylEmail: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Check if user is suspended
    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact support: 255636756591',
        suspended: true,
        reason: user.suspensionReason || 'No reason provided',
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Auth Middleware Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
    });
  }
}

// ==========================================
// Admin Only - Check if user is Admin or Super Admin
// ==========================================

export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
}

// ==========================================
// Super Admin Only - Check if user is Super Admin
// ==========================================

export function superAdminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role === 'SUPER_ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Super Admin access required',
    });
  }
}

// ==========================================
// Optional: Get User from Token (for WebSocket or non-route functions)
// ==========================================

export function getUserFromToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// ==========================================
// Optional: Generate New Token (for refresh)
// ==========================================

export function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export default {
  authenticate,
  adminOnly,
  superAdminOnly,
  getUserFromToken,
  generateToken,
};