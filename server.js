// server.js
// This is the main server for Render — it keeps running 24/7
// It maps all your API routes to the files you already created

import express from 'express';
import registerHandler from './api/register.js';
import loginHandler from './api/login.js';
import meHandler from './api/me.js';
import deployHandler from './api/customer/deploy.js';
import serversHandler from './api/customer/servers.js';

import path from 'path';
import { fileURLToPath } from 'url';

// === INITIALIZE EXPRESS ===
const app = express();
const port = process.env.PORT || 3000;

// Get the current directory path (for serving static files)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === MIDDLEWARE ===
// This allows your server to read JSON data sent from your frontend
app.use(express.json());

// === ROUTES (Your API Endpoints) ===
// These connect the URL paths to your backend files

// Auth Routes (Sign up, Log in, Get Profile)
app.post('/api/register', registerHandler);
app.post('/api/login', loginHandler);
app.get('/api/me', meHandler);

// Customer Routes (Dashboard, Deploy Bot)
app.get('/api/customer/servers', serversHandler);
app.post('/api/customer/deploy', deployHandler);

// === SERVE STATIC FILES (Your Frontend Pages) ===
// This tells Express to serve all the files inside the 'public' folder
// So your HTML, CSS, and JS files are accessible
app.use(express.static(path.join(__dirname, 'public')));

// === CATCH-ALL ROUTE ===
// If someone visits any URL that doesn't match an API route,
// send them the landing page (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === START THE SERVER ===
app.listen(port, () => {
  console.log(`©big hosting by bigmanjtech ™ is running on port ${port}`);
});