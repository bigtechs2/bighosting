// api/pterodactyl/create.js
// This file creates a bot server on your Pterodactyl Panel

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the plan and user details from the request
  const { planId, serverName } = req.body;
  const userId = req.user?.id; // This comes from your login token

  if (!userId) {
    return res.status(401).json({ error: 'You must be logged in' });
  }

  try {
    // 1. Get the plan details from your database (512MB, 1GB, etc.)
    // For now, we use a fixed plan for testing
    const ram = 1024; // 1GB
    const disk = 5120; // 5GB
    const cpu = 100; // 1 core

    // 2. Tell Pterodactyl to create the server
    const response = await fetch(`${process.env.PTERO_URL}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: serverName || 'My Bot',
        user: parseInt(userId), // Your Pterodactyl user ID
        egg: parseInt(process.env.MICKEY_EGG_ID), // Your Mickey egg ID
        docker_image: 'ghcr.io/ptero-eggs/yolks:nodejs_25',
        startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; npm install; npm start',
        environment: {
          NODE_ENV: 'production',
          AUTO_UPDATE: '1'
        },
        limits: {
          memory: ram,
          disk: disk,
          cpu: cpu,
          swap: 0,
          io: 500
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to create server');
    }

    // 3. Save the server to your database (optional for now)
    // 4. Return success
    res.status(201).json({
      success: true,
      message: 'Bot server created!',
      server: data.attributes
    });

  } catch (error) {
    console.error('Pterodactyl create error:', error);
    res.status(500).json({ error: error.message || 'Failed to create server' });
  }
}