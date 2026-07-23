// ==========================================
// © bighosting by bigmanjtech™
// Authentication Routes
// Register, Login, Forgot Password, Reset
// ==========================================

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import { createPterodactylUser } from '../services/pterodactylService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// ==========================================
// 1. REGISTER
// ==========================================

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (name.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Pterodactyl user
    let pterodactylUserId = null;
    let pterodactylEmail = null;

    try {
      const pteroUser = await createPterodactylUser(
        email.toLowerCase(),
        email.split('@')[0],
        name.split(' ')[0] || 'User',
        name.split(' ').slice(1).join(' ') || 'BotHosting'
      );
      if (pteroUser.success) {
        pterodactylUserId = pteroUser.userId;
        pterodactylEmail = pteroUser.email;
      }
    } catch (error) {
      console.warn('⚠️ Pterodactyl user creation failed:', error.message);
      // Continue anyway — user can be created later
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        pterodactylUserId: pterodactylUserId,
        pterodactylEmail: pterodactylEmail || email.toLowerCase(),
        role: 'USER',
        isSuspended: false,
      },
    });

    // Send welcome email (don't await — let it run in background)
    sendWelcomeEmail(email, name).catch(console.error);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('❌ Register Error:', error.message);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ==========================================
// 2. LOGIN
// ==========================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if suspended
    if (user.isSuspended) {
      return res.status(403).json({
        message: 'Account suspended. Contact support: 255636756591',
        suspended: true,
        reason: user.suspensionReason || 'No reason provided',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuspended: user.isSuspended,
      },
    });

  } catch (error) {
    console.error('❌ Login Error:', error.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ==========================================
// 3. FORGOT PASSWORD
// ==========================================

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not — security best practice
      return res.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Delete any existing reset tokens for this email
    await prisma.passwordReset.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Create new reset token
    await prisma.passwordReset.create({
      data: {
        email: email.toLowerCase(),
        token: token,
        expiresAt: expiresAt,
        used: false,
      },
    });

    // Build reset link
    const resetLink = `${APP_URL}/reset-password.html?token=${token}`;

    // Send email
    await sendPasswordResetEmail(email, user.name, resetLink);

    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });

  } catch (error) {
    console.error('❌ Forgot Password Error:', error.message);
    res.status(500).json({ message: 'Failed to process request. Please try again.' });
  }
});

// ==========================================
// 4. VALIDATE RESET TOKEN
// ==========================================

router.get('/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Find token
    const reset = await prisma.passwordReset.findUnique({
      where: { token: token },
    });

    if (!reset) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (reset.used) {
      return res.status(400).json({ message: 'Token has already been used' });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: reset.email },
    });

    if (!user) {
      return res.status(400).json({ message: 'User no longer exists' });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: reset.email,
    });

  } catch (error) {
    console.error('❌ Validate Token Error:', error.message);
    res.status(500).json({ message: 'Failed to validate token' });
  }
});

// ==========================================
// 5. RESET PASSWORD
// ==========================================

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Find token
    const reset = await prisma.passwordReset.findUnique({
      where: { token: token },
    });

    if (!reset) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (reset.used) {
      return res.status(400).json({ message: 'Token has already been used' });
    }

    if (reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await prisma.user.update({
      where: { email: reset.email },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used: true },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('❌ Reset Password Error:', error.message);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});

// ==========================================
// 6. GET CURRENT USER
// ==========================================

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('❌ Get Me Error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// ==========================================
// 7. LOGOUT (Client-side only)
// ==========================================

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;