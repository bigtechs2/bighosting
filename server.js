// server.js
// This is the main server for Render — it keeps running 24/7
// It maps all your API routes to the files you already created

import express from 'express';
import registerHandler from './api/register.js';
import loginHandler from './api/login.js';
import meHandler from './api/me.js';
import deployHandler from './api/customer/deploy.js';
import serversHandler from './api/customer/servers.js';
import createServerHandler from './api/pterodactyl/create.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// === ROUTES ===
// These connect the URL to your API files

// Auth Routes
app.post('/api/register', (req, res) => registerHandler(req, res));
app.post('/api/login', (req, res) => loginHandler(req, res));
app.get('/api/me', (req, res) => meHandler(req, res));

// Customer Routes (Dashboard)
app.get('/api/customer/servers', (req, res) => serversHandler(req, res));
app.post('/api/customer/deploy', (req, res) => deployHandler(req, res));

// Pterodactyl Routes (Bot Creation)
app.post('/api/pterodactyl/create', (req, res) => createServerHandler(req, res));

// Serve your frontend pages (HTML, CSS, JS)
// This tells Express to serve files from the 'public' folder
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (your HTML pages)
app.use(express.static(path.join(__dirname, 'public')));

// For any other route, serve index.html (for SPA routing, optional)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`©big hosting by bigmanjtech ™ is running on http://localhost:${port}`);
});