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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---- Serve Static Frontend ----
const frontendPath = path.join(__dirname, 'src', 'frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'bighosting by bigmanjtech™',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---- API Status ----
app.get('/api/status', (req, res) => {
  res.json({
    message: '🚀 bighosting API is running!',
    version: '1.0.0',
    business: '255636756591',
  });
});

// ---- Error Handler ----
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`© bighosting by bigmanjtech™`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Visit: http://localhost:${PORT}`);
  console.log(`📞 Business Contact: ${process.env.BUSINESS_PHONE}`);
  console.log(`=========================================`);
});

export { prisma };