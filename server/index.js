const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const { sendStatusDM, assignGuildRole, removeDepartmentRoles, sendChannelNotification, sendNewApplicationNotification, sendStaffActionLog, DEPARTMENT_ROLES, client } = require('./discordBot');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Simplified to allow all for production stability
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online' });
});

// Initialize Firebase Admin
try {
  const fs = require('fs');
  const path = require('path');
  
  // Try several potential paths for the secret file
  const potentialPaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    './firebase-admin.json',
    '../firebase-admin.json',
    '/app/firebase-admin.json',
    path.join(__dirname, 'firebase-admin.json'),
    path.join(__dirname, '..', 'firebase-admin.json')
  ].filter(Boolean);

  let serviceAccount = null;
  let foundPath = null;

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      serviceAccount = require(path.resolve(p));
      foundPath = p;
      break;
    }
  }

  if (serviceAccount) {
    global.foundServiceAccount = serviceAccount;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log(`🔥 Firebase Admin initialized using: ${foundPath}`);
  } else {
    throw new Error('No valid firebase-admin.json found in any potential path.');
  }
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK not configured correctly. ' + error.message);
}

const db = admin.apps.length > 0 ? admin.firestore() : null;
if (!db) console.warn('❗ Firestore features are disabled (Admin SDK not initialized)');

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '1.0.9-hotfix-revoke',
    bot: !!process.env.DISCORD_BOT_TOKEN,
    db: !!db
  });
});

/**
 * Filtered Staff Feed — returns all staff-level users (admin, police, ems, mechanic)
 * GET /api/users
 */
app.get('/api/users', async (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: 'DB not initialized' });
  try {
    const staffRoles = ['admin', 'police', 'ems', 'mechanic'];
    const snapshot = await db.collection('Users').where('role', 'in', staffRoles).get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Silent User Creation (Backend only)
 * POST /api/users
 */
app.post('/api/users', async (req, res) => {
  const { email, password, name, discordUsername, role } = req.body;
  console.log(`📡 Request to create admin: ${email}`);
  
  if (!db) return res.status(500).json({ success: false, message: 'Database system not connected.' });

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Invalid data. Password must be at least 6 characters.' });
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    const uid = userRecord.uid;

    const userData = {
      name: name || 'Unnamed Staff',
      email,
      discordUsername: discordUsername || '',
      role: role || 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('Users').doc(uid).set(userData);
    console.log(`✅ Administratively created user: ${uid} (${email})`);
    res.json({ success: true, user: { id: uid, ...userData } });
  } catch (error) {
    console.error('❌ Creation Error:', error.code, error.message);
    let userMessage = 'Failed to create account.';
    if (error.code === 'auth/email-already-exists') userMessage = 'This email is already registered.';
    if (error.code === 'auth/invalid-email') userMessage = 'The email address is invalid.';
    res.status(400).json({ success: false, message: userMessage, originalError: error.message });
  }
});

/**
 * Notify User via Discord DM
 * POST /api/notify-user
 */
app.post('/api/notify-user', async (req, res) => {
  const { discordId, status, name, type, jobRank, interviewDate, interviewTime, adminMessage } = req.body;
  console.log(`📬 Received /api/notify-user: ID=${discordId}, Status=${status}, User=${name}`);

  if (!discordId || !status || !name) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const metadata = { jobRank, interviewDate, interviewTime, adminMessage };
  const result = await sendStatusDM(discordId, status, name, type, metadata);
  
  const typeKey = (type || '').toLowerCase();
  
  // Assign Discord roles if approved
  if (status === 'approved' && DEPARTMENT_ROLES[typeKey]) {
    const config = DEPARTMENT_ROLES[typeKey];
    let rolesToAssign = [];
    
    if (typeof config === 'string') {
      // Simple role ID (e.g., civilian)
      rolesToAssign = [config];
    } else {
      // Complex role object with ranks (e.g., police, ems, mechanic)
      const baseRole = config.base;
      const rankRole = config.ranks ? config.ranks[jobRank] : null;
      rolesToAssign = [baseRole, rankRole].filter(id => !!id);
    }
    
    if (rolesToAssign.length > 0) {
      await assignGuildRole(discordId, rolesToAssign);
    }
  }

  // Send notification to the department-specific Discord channel (ONLY for approved & rejected)
  let channelResult = { success: false };
  if (status === 'approved' || status === 'rejected') {
    channelResult = await sendChannelNotification(type, status, name, discordId, metadata);
    console.log(`📢 Channel notification result:`, channelResult);
  } else {
    console.log(`ℹ️ Status is ${status}, skipping channel notification (DM only)`);
    channelResult = { success: true }; // Treat as success since we intentionally skipped
  }
  
  // Always return 200 success to frontend so it doesn't show "discord failed" 
  // just because the user has their DMs closed (very common).
  res.json({ 
    success: true, 
    dmSuccess: result.success,
    channelSuccess: channelResult.success,
    message: 'Discord processing completed.' 
  });
});

/**
 * Notify when a new application is submitted
 * POST /api/notify-new-application
 */
app.post('/api/notify-new-application', async (req, res) => {
  const { name, discordId, type } = req.body;
  console.log(`📬 Received /api/notify-new-application: User=${name}, Type=${type}`);

  if (!name || !discordId) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const result = await sendNewApplicationNotification(name, discordId, type);
  // Send a DM to acknowledge receipt
  await sendStatusDM(discordId, 'received', name, type);

  if (result.success) {
    res.json({ success: true, message: 'Notification sent' });
  } else {
    res.status(500).json({ success: false, message: result.error });
  }
});

/**
 * Revoke Discord Role (when application is deleted)
 * POST /api/revoke-role
 */
app.post('/api/revoke-role', async (req, res) => {
  const { discordId, type } = req.body;
  console.log(`🔴 Received /api/revoke-role: ID=${discordId}, Type=${type}`);

  if (!discordId || !type) {
    return res.status(400).json({ success: false, message: 'Missing discordId or type' });
  }

  try {
    const result = await removeDepartmentRoles(discordId, type);
    if (result.success) {
      res.json({ success: true, message: `Discord roles for ${type} revoked successfully` });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('❌ Revoke role failed:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Whitelist User on FiveM (Option B: Firestore sync)
 * POST /api/whitelist-player
 */
app.post('/api/whitelist-player', async (req, res) => {
  const { discordId, name } = req.body;

  if (!discordId || !name || !db) {
    return res.status(400).json({ success: false, message: 'Missing data or DB not initialized' });
  }

  try {
    // Store in approvedPlayers collection for FiveM server to check
    await db.collection('approvedPlayers').doc(discordId).set({
      discordId,
      name,
      addedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Player added to whitelist' });
  } catch (error) {
    console.error('❌ Whitelist error:', error);
    res.status(500).json({ success: false, message: 'Failed to update whitelist' });
  }
});

/**
 * Check for duplicate Discord ID (Public helper)
 */
app.get('/api/check-duplicate/:discordId', async (req, res) => {
  const { discordId } = req.params;
  if (!db) return res.status(500).json({ success: false, message: 'DB not initialized' });

  try {
    const q = await db.collection('whitelistApplications').where('discordId', '==', discordId).get();
    res.json({ success: true, exists: !q.empty });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Delete User (Auth + Firestore)
 * DELETE /api/users/:uid
 * Security Note: In a live app, you would verify the requester's admin token here.
 */
app.delete('/api/users/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    // 1. Delete from Firebase Auth (if they exist)
    try {
      await admin.auth().deleteUser(uid);
      console.log(`👤 Deleted Auth User: ${uid}`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.warn(`⚠️ User ${uid} already missing from Auth.`);
      } else {
        throw authError;
      }
    }

    // 2. Delete from Firestore (Always attempt)
    let userRole = 'civilian';
    if (db) {
      const userDoc = await db.collection('Users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData.role || 'civilian';
        
        // Surgical Role Removal: Only remove department roles, keep Citizen
        const discordIdentifier = userData.discordId || userData.discordUsername;
        if (discordIdentifier && ['police', 'ems', 'mechanic'].includes(userRole)) {
           console.log(`📡 Surgically removing ${userRole} roles for: ${discordIdentifier}`);
           await removeDepartmentRoles(discordIdentifier, userRole);
        }
      }
      await db.collection('Users').doc(uid).delete();
      console.log(`📄 Deleted Firestore Doc: ${uid}`);
    }

    res.json({ success: true, message: 'User permanently removed.' });
  } catch (error) {
    console.error('❌ Deletion failed:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * txAdmin Proxy - Fetch Player List
 */
app.get('/api/server/players', async (req, res) => {
  const txUrl = process.env.TX_ADMIN_URL;
  const txToken = process.env.TX_ADMIN_TOKEN;

  if (!txUrl || !txToken) {
    return res.status(503).json({ success: false, message: 'txAdmin not configured' });
  }

  try {
    const response = await axios.get(`${txUrl}/query/players`, {
      headers: { 'Authorization': `Bearer ${txToken}` },
      timeout: 5000
    });
    res.json({ success: true, players: response.data });
  } catch (error) {
    console.error('❌ txAdmin Player Fetch Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch players from txAdmin' });
  }
});

/**
 * Enhanced Server Status - Fetch player count, uptime, and metadata
 * Proxies txAdmin (real-time) or falls back to Cfx.re API
 */
app.get('/api/server/status', async (req, res) => {
  const txUrl = process.env.TX_ADMIN_URL;
  const txToken = process.env.TX_ADMIN_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const SERVER_ID = '4gblo45'; // Configured FiveM Server ID

  try {
    let discordMembers = 0;
    try {
      if (client.isReady()) {
        const guild = GUILD_ID ? await client.guilds.fetch(GUILD_ID) : client.guilds.cache.first();
        if (guild) discordMembers = guild.memberCount;
      }
    } catch (dErr) {
      console.warn('⚠️ Could not fetch Discord member count:', dErr.message);
    }

    // 1. Try txAdmin (Most Accurate & Real-time)
    if (txUrl && txToken) {
      try {
        const [playersRes, infoRes] = await Promise.all([
          axios.get(`${txUrl}/query/players`, { headers: { 'Authorization': `Bearer ${txToken}` }, timeout: 3000 }),
          axios.get(`${txUrl}/stats.json`, { headers: { 'Authorization': `Bearer ${txToken}` }, timeout: 3000 })
        ]).catch(() => [null, null]);

        if (playersRes && playersRes.data) {
          const players = playersRes.data;
          let uptime = 'Online';
          let maxPlayers = 48;
          let queue = 0;
          let staffOnline = 0;

          // Count Staff Online
          try {
            if (db) {
              const staffSnapshot = await db.collection('Users').where('role', 'in', ['admin', 'police', 'ems', 'mechanic']).get();
              const staffDiscordIds = new Set(staffSnapshot.docs.map(doc => doc.data().discordId || doc.id));
              
              players.forEach(p => {
                const discordId = p.identifiers.find(id => id.startsWith('discord:'))?.replace('discord:', '');
                if (discordId && staffDiscordIds.has(discordId)) {
                  staffOnline++;
                }
              });
            }
          } catch (sErr) {
             console.warn('⚠️ Staff online count failed:', sErr.message);
          }

          if (infoRes && infoRes.data) {
            const stats = infoRes.data;
            // Format uptime
            if (stats.uptime) {
              const seconds = parseInt(stats.uptime);
              const hours = Math.floor(seconds / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            }
            maxPlayers = stats.maxClients || 48;
            queue = stats.queue || 0;
          }

          return res.json({
            success: true,
            source: 'txAdmin',
            online: true,
            players: players.length,
            maxPlayers,
            queue,
            staffOnline,
            uptime,
            discordMembers,
            hostname: 'Dream City Roleplay | Season 2',
            gametype: 'Roleplay',
            mapname: 'Los Santos',
            ping: '42ms'
          });
        }
      } catch (txErr) {
        console.warn('⚠️ txAdmin status fetch failed, falling back to Cfx.re:', txErr.message);
      }
    }

    // 2. Fallback to Cfx.re Public API (using a more reliable domain)
    const cfxRes = await axios.get(`https://servers-live.fivem.net/api/servers/single/${SERVER_ID}`, { 
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000 
    });
    const data = cfxRes.data.Data;

    let uptime = 'Online';
    if (data.vars && data.vars.uptime) {
      const seconds = parseInt(data.vars.uptime);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    res.json({
      success: true,
      source: 'Cfx.re',
      online: true,
      players: data.clients || 0,
      maxPlayers: data.sv_maxclients || 48,
      queue: 0,
      staffOnline: 0,
      uptime,
      discordMembers,
      hostname: data.hostname || 'Dream City Roleplay | Season 2',
      gametype: data.gametype || 'Roleplay',
      mapname: data.mapname || 'Los Santos',
      ping: '42ms'
    });

  } catch (error) {
    console.error('❌ Server Status Fetch Error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server unreachable',
      online: false,
      players: 0,
      maxPlayers: 48,
      uptime: 'Offline',
      discordMembers: 0
    });
  }
});

/**
 * txAdmin Proxy - Perform Action
 */
app.post('/api/server/action', async (req, res) => {
  const { action, target, reason, command, staffName, targetName } = req.body;
  const txUrl = process.env.TX_ADMIN_URL;
  const txToken = process.env.TX_ADMIN_TOKEN;

  if (!txUrl || !txToken) {
    return res.status(503).json({ success: false, message: 'txAdmin not configured' });
  }

  try {
    let endpoint = '';
    let data = {};

    switch (action) {
      case 'heal':
        endpoint = '/player/heal';
        data = { id: target };
        break;
      case 'kick':
        endpoint = '/player/kick';
        data = { id: target, reason: reason || 'Kicked by Staff from Website' };
        break;
      case 'command':
        endpoint = '/fxadmin/commands';
        data = { command: command };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const response = await axios.post(`${txUrl}${endpoint}`, data, {
      headers: { 'Authorization': `Bearer ${txToken}` },
      timeout: 5000
    });

    // Log to Discord for audit
    if (staffName) {
      await sendStaffActionLog(staffName, action, targetName || 'Unknown', target || 'Global', reason || command);
    }

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(`❌ txAdmin Action Error (${action}):`, error.message);
    res.status(500).json({ success: false, message: error.response?.data?.message || 'txAdmin action failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
