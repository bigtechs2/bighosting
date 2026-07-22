// api/register.js
// ©big hosting by bigmanjtech ™ — User Registration API

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { full_name, email, password, country, phone } = req.body;

  // Validate required fields
  if (!full_name || !email || !password || !country) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // If country is Tanzania, phone number is required
  if (country === 'Tanzania' && !phone) {
    return res.status(400).json({ error: 'Phone number is required for Tanzania' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        full_name: full_name,
        email: email,
        password_hash: hashedPassword,
        country: country,
        phone: phone || null,
        currency: country === 'Tanzania' ? 'TZS' : 'USD'
      }
    });

    // Return success (don't send password back)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        country: newUser.country,
        currency: newUser.currency
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}