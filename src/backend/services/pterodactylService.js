// ==========================================
// © bighosting by bigmanjtech™
// Pterodactyl Service – Nest #5 (Mickey)
// WhatsApp & Telegram Bot Hosting
// ==========================================

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PANEL_URL = process.env.PTERODACTYL_PANEL_URL;
const API_KEY = process.env.PTERODACTYL_API_KEY;
const CLIENT_API_KEY = process.env.PTERODACTYL_CLIENT_API_KEY;
const DEFAULT_NEST = parseInt(process.env.PTERODACTYL_DEFAULT_NEST) || 5;
const DEFAULT_EGG = parseInt(process.env.PTERODACTYL_DEFAULT_EGG) || 1;
const DEFAULT_NODE = parseInt(process.env.PTERODACTYL_DEFAULT_NODE) || 1;

// ==========================================
// Application API (Admin Actions)
// ==========================================

const appApi = axios.create({
  baseURL: `${PANEL_URL}/api/application`,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ==========================================
// Client API (User Actions)
// ==========================================

const clientApi = (apiKey) => axios.create({
  baseURL: `${PANEL_URL}/api/client`,
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ==========================================
// 1. CREATE SERVER (Application API)
// ==========================================

export async function createPterodactylServer({
  name,
  userId, // Pterodactyl User ID
  plan, // { ramLimit, diskLimit, cpuLimit }
  description = '',
}) {
  try {
    const payload = {
      name: name,
      user: userId,
      egg: DEFAULT_EGG,
      nest: DEFAULT_NEST,
      node: DEFAULT_NODE,
      description: description || name,
      limits: {
        memory: plan.ramLimit, // 0 = unlimited
        disk: plan.diskLimit,   // 0 = unlimited
        cpu: plan.cpuLimit,     // 0 = unlimited
        swap: 0,
        io: 500,
      },
      feature_limits: {
        databases: 0,
        allocations: 1,
        backups: 0,
      },
      environment: {
        // Node.js 25 default startup variables
        AUTO_UPDATE: '0',
        NODE_VERSION: '25',
        STARTUP_SCRIPT: 'npm start',
        INSTALL_DEPENDENCIES: '1',
      },
      startup: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_VERSION} ]]; then export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; nvm install ${NODE_VERSION} 2>/dev/null || true; fi; if [[ {{INSTALL_DEPENDENCIES}} == "1" ]]; then npm install || true; fi; npm start',
      image: 'ghcr.io/ptero-eggs/yolks:nodejs_25',
      skip_scripts: false,
      oom_disabled: true,
    };

    const response = await appApi.post('/servers', payload);
    return {
      success: true,
      serverId: response.data.attributes.id,
      identifier: response.data.attributes.identifier,
      uuid: response.data.attributes.uuid,
      name: response.data.attributes.name,
      description: response.data.attributes.description,
      node: response.data.attributes.node,
      limits: response.data.attributes.limits,
      allocation: response.data.attributes.allocation,
      status: response.data.attributes.status,
      createdAt: response.data.attributes.created_at,
    };
  } catch (error) {
    console.error('❌ Pterodactyl Create Server Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.detail || 'Failed to create server');
  }
}

// ==========================================
// 2. GET SERVER DETAILS (Client API)
// ==========================================

export async function getServerDetails(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    const response = await api.get(`/servers/${serverId}`);
    return {
      success: true,
      data: response.data.attributes,
    };
  } catch (error) {
    console.error('❌ Get Server Details Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch server details');
  }
}

// ==========================================
// 3. START SERVER (Client API)
// ==========================================

export async function startServer(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/power`, { signal: 'start' });
    return { success: true, message: 'Server started successfully' };
  } catch (error) {
    console.error('❌ Start Server Error:', error.response?.data || error.message);
    throw new Error('Failed to start server');
  }
}

// ==========================================
// 4. STOP SERVER (Client API)
// ==========================================

export async function stopServer(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/power`, { signal: 'stop' });
    return { success: true, message: 'Server stopped successfully' };
  } catch (error) {
    console.error('❌ Stop Server Error:', error.response?.data || error.message);
    throw new Error('Failed to stop server');
  }
}

// ==========================================
// 5. RESTART SERVER (Client API)
// ==========================================

export async function restartServer(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/power`, { signal: 'restart' });
    return { success: true, message: 'Server restarted successfully' };
  } catch (error) {
    console.error('❌ Restart Server Error:', error.response?.data || error.message);
    throw new Error('Failed to restart server');
  }
}

// ==========================================
// 6. KILL SERVER (Client API)
// ==========================================

export async function killServer(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/power`, { signal: 'kill' });
    return { success: true, message: 'Server killed successfully' };
  } catch (error) {
    console.error('❌ Kill Server Error:', error.response?.data || error.message);
    throw new Error('Failed to kill server');
  }
}

// ==========================================
// 7. REINSTALL SERVER (Client API)
// ==========================================

export async function reinstallServer(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/reinstall`);
    return { success: true, message: 'Server reinstall initiated' };
  } catch (error) {
    console.error('❌ Reinstall Server Error:', error.response?.data || error.message);
    throw new Error('Failed to reinstall server');
  }
}

// ==========================================
// 8. GET CONSOLE LOGS (Client API)
// ==========================================

export async function getConsoleLogs(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    const response = await api.get(`/servers/${serverId}/websocket`);
    // Returns WebSocket token for real-time console
    return {
      success: true,
      token: response.data.data.token,
      socket: response.data.data.socket,
    };
  } catch (error) {
    console.error('❌ Get Console Logs Error:', error.response?.data || error.message);
    throw new Error('Failed to get console logs');
  }
}

// ==========================================
// 9. SEND COMMAND (Client API)
// ==========================================

export async function sendCommand(serverId, command, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/command`, { command });
    return { success: true, message: 'Command sent successfully' };
  } catch (error) {
    console.error('❌ Send Command Error:', error.response?.data || error.message);
    throw new Error('Failed to send command');
  }
}

// ==========================================
// 10. GET FILE LIST (Client API)
// ==========================================

export async function getFileList(serverId, userApiKey, directory = '/') {
  try {
    const api = clientApi(userApiKey);
    const response = await api.get(`/servers/${serverId}/files/list`, {
      params: { directory },
    });
    return {
      success: true,
      files: response.data.data,
    };
  } catch (error) {
    console.error('❌ Get File List Error:', error.response?.data || error.message);
    throw new Error('Failed to get file list');
  }
}

// ==========================================
// 11. GET FILE CONTENTS (Client API)
// ==========================================

export async function getFileContents(serverId, userApiKey, filePath) {
  try {
    const api = clientApi(userApiKey);
    const response = await api.get(`/servers/${serverId}/files/contents`, {
      params: { file: filePath },
    });
    return {
      success: true,
      content: response.data,
    };
  } catch (error) {
    console.error('❌ Get File Contents Error:', error.response?.data || error.message);
    throw new Error('Failed to get file contents');
  }
}

// ==========================================
// 12. WRITE FILE (Client API)
// ==========================================

export async function writeFile(serverId, userApiKey, filePath, content) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/files/write`, {
      file: filePath,
      content: content,
    });
    return { success: true, message: 'File written successfully' };
  } catch (error) {
    console.error('❌ Write File Error:', error.response?.data || error.message);
    throw new Error('Failed to write file');
  }
}

// ==========================================
// 13. CREATE FOLDER (Client API)
// ==========================================

export async function createFolder(serverId, userApiKey, folderPath) {
  try {
    const api = clientApi(userApiKey);
    await api.post(`/servers/${serverId}/files/create-folder`, {
      name: folderPath,
    });
    return { success: true, message: 'Folder created successfully' };
  } catch (error) {
    console.error('❌ Create Folder Error:', error.response?.data || error.message);
    throw new Error('Failed to create folder');
  }
}

// ==========================================
// 14. DELETE FILE (Client API)
// ==========================================

export async function deleteFile(serverId, userApiKey, filePath) {
  try {
    const api = clientApi(userApiKey);
    await api.delete(`/servers/${serverId}/files/delete`, {
      data: { files: [filePath] },
    });
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('❌ Delete File Error:', error.response?.data || error.message);
    throw new Error('Failed to delete file');
  }
}

// ==========================================
// 15. GET RESOURCE USAGE (Client API)
// ==========================================

export async function getResourceUsage(serverId, userApiKey) {
  try {
    const api = clientApi(userApiKey);
    const response = await api.get(`/servers/${serverId}/resources`);
    return {
      success: true,
      resources: {
        cpu: response.data.attributes.cpu_absolute,
        memory: response.data.attributes.memory_bytes,
        disk: response.data.attributes.disk_bytes,
        network: {
          rx: response.data.attributes.network_rx_bytes,
          tx: response.data.attributes.network_tx_bytes,
        },
        uptime: response.data.attributes.uptime,
      },
    };
  } catch (error) {
    console.error('❌ Get Resource Usage Error:', error.response?.data || error.message);
    throw new Error('Failed to get resource usage');
  }
}

// ==========================================
// 16. SUSPEND SERVER (Application API)
// ==========================================

export async function suspendServer(serverId) {
  try {
    await appApi.post(`/servers/${serverId}/suspend`);
    return { success: true, message: 'Server suspended' };
  } catch (error) {
    console.error('❌ Suspend Server Error:', error.response?.data || error.message);
    throw new Error('Failed to suspend server');
  }
}

// ==========================================
// 17. UNSUSPEND SERVER (Application API)
// ==========================================

export async function unsuspendServer(serverId) {
  try {
    await appApi.post(`/servers/${serverId}/unsuspend`);
    return { success: true, message: 'Server unsuspended' };
  } catch (error) {
    console.error('❌ Unsuspend Server Error:', error.response?.data || error.message);
    throw new Error('Failed to unsuspend server');
  }
}

// ==========================================
// 18. DELETE SERVER (Application API)
// ==========================================

export async function deleteServer(serverId, force = false) {
  try {
    await appApi.delete(`/servers/${serverId}`, {
      params: { force: force },
    });
    return { success: true, message: 'Server deleted' };
  } catch (error) {
    console.error('❌ Delete Server Error:', error.response?.data || error.message);
    throw new Error('Failed to delete server');
  }
}

// ==========================================
// 19. CREATE PTERODACTYL USER (Application API)
// ==========================================

export async function createPterodactylUser(email, username, firstName, lastName) {
  try {
    const response = await appApi.post('/users', {
      email: email,
      username: username || email.split('@')[0],
      first_name: firstName || 'User',
      last_name: lastName || 'BotHosting',
      language: 'en',
    });
    return {
      success: true,
      userId: response.data.attributes.id,
      email: response.data.attributes.email,
      username: response.data.attributes.username,
    };
  } catch (error) {
    console.error('❌ Create Pterodactyl User Error:', error.response?.data || error.message);
    throw new Error('Failed to create Pterodactyl user');
  }
}

// ==========================================
// 20. GET PTERODACTYL USER (Application API)
// ==========================================

export async function getPterodactylUserByEmail(email) {
  try {
    const response = await appApi.get('/users', {
      params: { filter: { email: email } },
    });
    if (response.data.data.length > 0) {
      return {
        success: true,
        userId: response.data.data[0].attributes.id,
        email: response.data.data[0].attributes.email,
        username: response.data.data[0].attributes.username,
      };
    }
    return { success: false, message: 'User not found' };
  } catch (error) {
    console.error('❌ Get Pterodactyl User Error:', error.response?.data || error.message);
    return { success: false, message: 'Failed to find user' };
  }
}

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

export default {
  createPterodactylServer,
  getServerDetails,
  startServer,
  stopServer,
  restartServer,
  killServer,
  reinstallServer,
  getConsoleLogs,
  sendCommand,
  getFileList,
  getFileContents,
  writeFile,
  createFolder,
  deleteFile,
  getResourceUsage,
  suspendServer,
  unsuspendServer,
  deleteServer,
  createPterodactylUser,
  getPterodactylUserByEmail,
};