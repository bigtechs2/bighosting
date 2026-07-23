// server.js
import express from 'express';
import registerHandler from './api/register.js';
import loginHandler from './api/login.js';
import meHandler from './api/me.js';
import deployHandler from './api/customer/deploy.js';
import serversHandler from './api/customer/servers.js';

import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// --- WRAPPED ROUTES WITH ERROR HANDLING ---
// This will catch crashes and return them as JSON errors

app.post('/api/register', async (req, res) => {
  try {
    await registerHandler(req, res);
  } catch (error) {
    console.error('Register crash:', error);
    res.status(500).json({ error: 'Server crash: ' + error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    await loginHandler(req, res);
  } catch (error) {
    console.error('Login crash:', error);
    res.status(500).json({ error: 'Server crash: ' + error.message });
  }
});

app.get('/api/me', async (req, res) => {
  try {
    await meHandler(req, res);
  } catch (error) {
    console.error('Me crash:', error);
    res.status(500).json({ error: 'Server crash: ' + error.message });
  }
});

app.get('/api/customer/servers', async (req, res) => {
  try {
    await serversHandler(req, res);
  } catch (error) {
    console.error('Servers crash:', error);
    res.status(500).json({ error: 'Server crash: ' + error.message });
  }
});

app.post('/api/customer/deploy', async (req, res) => {
  try {
    await deployHandler(req, res);
  } catch (error) {
    console.error('Deploy crash:', error);
    res.status(500).json({ error: 'Server crash: ' + error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`©big hosting running on port ${port}`);
});