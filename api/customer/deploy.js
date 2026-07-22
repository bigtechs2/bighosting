// api/customer/deploy.js
// This is the BRIDGE that connects your frontend to Pterodactyl
// It creates the bot server based on the user's plan and code

import authMiddleware from '../../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded plan details (matching your pricing table)
const PLANS = {
  '512': { ram: 512, disk: 1024, cpu: 100, name: 'Starter', price: 1500 },
  '1024': { ram: 1024, disk: 3072, cpu: 100, name: 'Pro', price: 3000 },
  '2048': { ram: 2048, disk: 6144, cpu: 200, name: 'Business', price: 5500 },
  '3072': { ram: 3072, disk: 10240, cpu: 200, name: 'Performance', price: 8000 },
  '4096': { ram: 4096, disk: 15360, cpu: 300, name: 'Advanced', price: 12000 },
  '5120': { ram: 5120, disk: 25600, cpu: 300, name: 'Enterprise', price: 17000 },
  '6144': { ram: 6144, disk: 40960, cpu: 400, name: 'Extreme', price: 23000 },
  '7168': { ram: 7168, disk: 61440, cpu: 400, name: 'Ultra', price: 30000 },
  '8192': { ram: 8192, disk: 81920, cpu: 500, name: 'Mega', price: 38000 },
  '9216': { ram: 9216, disk: 102400, cpu: 500, name: 'Titan', price: 47000 },
  '32768': { ram: 32768, disk: 512000, cpu: 800, name: 'Infinity', price: 100000 }
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // === STEP 1: Check if user is logged in ===
  let user;
  try {
    await new Promise((resolve, reject) => {
      authMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    user = req.user;
  } catch (error) {
    return res.status(401).json({ error: 'You must be logged in to deploy a bot' });
  }

  // === STEP 2: Parse the request body (supports both JSON and FormData) ===
  let body = req.body;
  let isFormData = false;

  // If the request has a 'Content-Type' of multipart/form-data, we need to parse it
  // For simplicity, we'll handle JSON for GitHub and special handling for ZIP later
  // For now, we support JSON (GitHub) and will simulate ZIP support
  const { plan, method, repo_url, env } = body;

  // Validate required fields
  if (!plan) {
    return res.status(400).json({ error: 'Plan is required' });
  }

  // Check if plan exists in our hardcoded list
  const planDetails = PLANS[plan];
  if (!planDetails) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  // Validate deployment method
  if (!method || !['github', 'zip'].includes(method)) {
    return res.status(400).json({ error: 'Valid deployment method (github or zip) is required' });
  }

  if (method === 'github' && !repo_url) {
    return res.status(400).json({ error: 'GitHub repository URL is required' });
  }

  // === STEP 3: Get or create Pterodactyl user ===
  // For now, we use a default admin user. In production, you'd create a user per customer.
  // You need to set PTERO_DEFAULT_USER_ID in your Vercel environment variables.
  const pterodactylUserId = process.env.PTERO_DEFAULT_USER_ID || 1;

  // === STEP 4: Prepare environment variables for Pterodactyl ===
  const envVars = env || {};
  // Add NODE_ENV as default
  if (!envVars.NODE_ENV) envVars.NODE_ENV = 'production';

  // === STEP 5: Create the server on Pterodactyl ===
  const serverName = req.body.server_name || `Bot-${Date.now()}`;

  try {
    // Construct the startup command (modified to handle git pull and npm install)
    // Your Mickey egg uses this format
    const startupCommand = `if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; npm install; npm start`;

    // Create the server on Pterodactyl
    const createResponse = await fetch(`${process.env.PTERO_URL}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: serverName,
        user: parseInt(pterodactylUserId),
        egg: parseInt(process.env.MICKEY_EGG_ID),
        docker_image: 'ghcr.io/ptero-eggs/yolks:nodejs_25',
        startup: startupCommand,
        environment: envVars,
        limits: {
          memory: planDetails.ram,
          disk: planDetails.disk,
          cpu: planDetails.cpu,
          swap: 0,
          io: 500
        },
        deploy: {
          // If GitHub, we set the repo URL here
          ...(method === 'github' && { repo_url: repo_url })
        }
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      throw new Error(createData.errors?.[0]?.detail || 'Pterodactyl creation failed');
    }

    // === STEP 6: Save the server to your database (for tracking) ===
    // This is optional but good for your admin panel later
    // We'll skip this for now to keep it simple

    // === STEP 7: Return success to the frontend ===
    res.status(201).json({
      success: true,
      message: 'Bot is being deployed! It may take 1-2 minutes to finish installing.',
      server: {
        id: createData.attributes.id,
        name: createData.attributes.name,
        status: createData.attributes.status || 'installing'
      }
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({
      error: error.message || 'Failed to deploy bot. Please try again.'
    });
  } finally {
    await prisma.$disconnect();
  }
}