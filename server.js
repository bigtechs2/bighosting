// ==========================================
// © bighosting by bigmanjtech™
// Main Express Server
// Serves API + Static Frontend (Black-Grey Theme)
// ==========================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// ============================
// INITIALIZE
// ============================
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ============================
// MIDDLEWARE
// ============================
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================
// SERVE STATIC FRONTEND
// ============================
// Serve static files from src/frontend
const frontendPath = path.join(__dirname, 'src', 'frontend');
app.use(express.static(frontendPath));

// Default route -> index.html (Landing page)
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================
// HEALTH CHECK (for Render)
// ============================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'bighosting by bigmanjtech™',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ============================
// API ROUTES (Placeholders)
// ============================
app.get('/api/status', (req, res) => {
  res.json({
    message: '🚀 bighosting API is running!',
    version: '1.0.0',
    business: '255636756591',
  });
});

// ============================
// ERROR HANDLER (Catch-all)
// ============================
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`© bighosting by bigmanjtech™`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Visit: http://localhost:${PORT}`);
  console.log(`📞 Business Contact: ${process.env.BUSINESS_PHONE}`);
  console.log(`=========================================`);
});

export { prisma };