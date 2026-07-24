// ==========================================
// © bighosting by bigmanjtech™
// Server Routes – Manage Pterodactyl Servers
// ==========================================

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import {
  getServerDetails,
  startServer,
  stopServer,
  restartServer,
  killServer,
  getResourceUsage,
  getConsoleLogs,
  sendCommand,
  getFileList,
  getFileContents,
  writeFile,
  createFolder,
  deleteFile,
  suspendServer,
  unsuspendServer,
  deleteServer,
} from '../services/pterodactylService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// Helper: Get User's Pterodactyl API Key
// ==========================================

function getUserApiKey(user) {
  // For now, we use the global client API key from env
  // In production, you'd store per-user API keys
  return process.env.PTERODACTYL_CLIENT_API_KEY;
}

// ==========================================
// 1. GET ALL SERVERS (User's Servers)
// ==========================================

router.get('/', authenticate, async (req, res) => {
  try {
    const servers = await prisma.server.findMany({
      where: { userId: req.user.id },
      include: {
        plan: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format response
    const formatted = servers.map((s) => ({
      id: s.id,
      serverIdentifier: s.serverIdentifier,
      name: s.name,
      description: s.description,
      status: s.status,
      planName: s.plan?.name || 'Unknown',
      ramLimit: s.ramLimit,
      diskLimit: s.diskLimit,
      cpuLimit: s.cpuLimit,
      port: s.port,
      node: s.node,
      suspended: s.suspended,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      servers: formatted,
      count: formatted.length,
    });

  } catch (error) {
    console.error('❌ Get Servers Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load servers',
    });
  }
});

// ==========================================
// 2. GET SINGLE SERVER DETAILS
// ==========================================

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
      include: {
        plan: true,
        order: true,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    // Get live resource usage from Pterodactyl
    let resources = null;
    try {
      const apiKey = getUserApiKey(req.user);
      const usage = await getResourceUsage(server.serverIdentifier, apiKey);
      if (usage.success) {
        resources = usage.resources;
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch live resources:', e.message);
    }

    res.json({
      success: true,
      server: {
        ...server,
        resources: resources,
      },
    });

  } catch (error) {
    console.error('❌ Get Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to load server details',
    });
  }
});

// ==========================================
// 3. START SERVER
// ==========================================

router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    if (server.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Server is suspended. Contact support: 255636756591',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await startServer(server.serverIdentifier, apiKey);

    // Update status in database
    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'RUNNING' },
    });

    res.json({
      success: true,
      message: 'Server started successfully',
    });

  } catch (error) {
    console.error('❌ Start Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start server',
    });
  }
});

// ==========================================
// 4. STOP SERVER
// ==========================================

router.post('/:id/stop', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    if (server.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Server is suspended. Contact support: 255636756591',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await stopServer(server.serverIdentifier, apiKey);

    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'STOPPED' },
    });

    res.json({
      success: true,
      message: 'Server stopped successfully',
    });

  } catch (error) {
    console.error('❌ Stop Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to stop server',
    });
  }
});

// ==========================================
// 5. RESTART SERVER
// ==========================================

router.post('/:id/restart', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    if (server.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Server is suspended. Contact support: 255636756591',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await restartServer(server.serverIdentifier, apiKey);

    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'RESTARTING' },
    });

    res.json({
      success: true,
      message: 'Server restarted successfully',
    });

  } catch (error) {
    console.error('❌ Restart Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restart server',
    });
  }
});

// ==========================================
// 6. KILL SERVER
// ==========================================

router.post('/:id/kill', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    if (server.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Server is suspended. Contact support: 255636756591',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await killServer(server.serverIdentifier, apiKey);

    await prisma.server.update({
      where: { id: server.id },
      data: { status: 'STOPPED' },
    });

    res.json({
      success: true,
      message: 'Server killed successfully',
    });

  } catch (error) {
    console.error('❌ Kill Server Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to kill server',
    });
  }
});

// ==========================================
// 7. GET CONSOLE LOGS (WebSocket Token)
// ==========================================

router.get('/:id/console', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await getConsoleLogs(server.serverIdentifier, apiKey);

    res.json({
      success: true,
      console: result,
    });

  } catch (error) {
    console.error('❌ Get Console Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get console',
    });
  }
});

// ==========================================
// 8. SEND COMMAND
// ==========================================

router.post('/:id/command', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Command is required',
      });
    }

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await sendCommand(server.serverIdentifier, command, apiKey);

    res.json({
      success: true,
      message: 'Command sent successfully',
    });

  } catch (error) {
    console.error('❌ Send Command Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send command',
    });
  }
});

// ==========================================
// 9. GET FILE LIST
// ==========================================

router.get('/:id/files', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { directory = '/' } = req.query;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await getFileList(server.serverIdentifier, apiKey, directory);

    res.json({
      success: true,
      files: result.files,
      directory: directory,
    });

  } catch (error) {
    console.error('❌ Get Files Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get file list',
    });
  }
});

// ==========================================
// 10. GET FILE CONTENTS
// ==========================================

router.get('/:id/files/content', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { file } = req.query;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File path is required',
      });
    }

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await getFileContents(server.serverIdentifier, apiKey, file);

    res.json({
      success: true,
      content: result.content,
      file: file,
    });

  } catch (error) {
    console.error('❌ Get File Content Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get file content',
    });
  }
});

// ==========================================
// 11. WRITE FILE
// ==========================================

router.post('/:id/files/write', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { file, content } = req.body;

    if (!file || content === undefined) {
      return res.status(400).json({
        success: false,
        message: 'File path and content are required',
      });
    }

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await writeFile(server.serverIdentifier, apiKey, file, content);

    res.json({
      success: true,
      message: 'File written successfully',
    });

  } catch (error) {
    console.error('❌ Write File Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to write file',
    });
  }
});

// ==========================================
// 12. DELETE FILE
// ==========================================

router.delete('/:id/files', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { file } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File path is required',
      });
    }

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await deleteFile(server.serverIdentifier, apiKey, file);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('❌ Delete File Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file',
    });
  }
});

// ==========================================
// 13. GET RESOURCE USAGE
// ==========================================

router.get('/:id/resources', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: req.user.id,
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const apiKey = getUserApiKey(req.user);
    const result = await getResourceUsage(server.serverIdentifier, apiKey);

    res.json({
      success: true,
      resources: result.resources,
    });

  } catch (error) {
    console.error('❌ Get Resources Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get resource usage',
    });
  }
});

export default router;