// api/customer/servers.js
// This file fetches all bot servers for the logged-in user from Pterodactyl

import authMiddleware from '../../middleware/auth.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Run the auth middleware to check if user is logged in
  await new Promise((resolve, reject) => {
    authMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // If auth failed, it would have returned a response already
  // So if we reach here, the user is authenticated
  const userId = req.user.id; // The Pterodactyl user ID (you'll set this during registration)

  try {
    // Fetch all servers from Pterodactyl for this user
    const response = await fetch(`${process.env.PTERO_URL}/api/application/users/${userId}/servers`, {
      headers: {
        'Authorization': `Bearer ${process.env.PTERO_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch servers from Pterodactyl');
    }

    const data = await response.json();

    // Format the server list for your dashboard
    const servers = data.data.map(server => ({
      id: server.attributes.id,
      name: server.attributes.name,
      status: server.attributes.status || 'unknown', // active, suspended, etc.
      ram: server.attributes.limits.memory,
      disk: server.attributes.limits.disk,
      cpu: server.attributes.limits.cpu,
      created_at: server.attributes.created_at,
      expires_at: server.attributes.expires_at || null
    }));

    // Return the list to the frontend
    res.status(200).json({
      success: true,
      servers: servers
    });

  } catch (error) {
    console.error('Fetch servers error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch your bots' });
  }
}