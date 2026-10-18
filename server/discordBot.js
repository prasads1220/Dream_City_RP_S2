const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Initialize Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers // Required to manage roles
  ]
});

const DEPARTMENT_ROLES = {
  civilian: '1493620549883003031',
  whitelist: '1493620549883003031',
  police: {
    base: '1493620510465200230', // Law Enforcement
    ranks: {
      'CADET': '1493620525283676190',
      'SOLO CADET': '1493620524402872510',
      'PROBATIONARY OFFICER': '1493620517154852905',
      'OFFICER': '1493620514403389571',
      'SENIOR OFFICER': '1493620513845547069',
      'SENIOR LEAD OFFICER': '1493620512356696215',
      'LANCE CORPORAL': '1495801541054042112',
      'CORPORAL': '1495801541905612870',
      'SERGEANT': '1495801542748406073',
      'HEAD SERGEANT': '1495801567222435942',
      'LIEUTENANT': '1495801570250461367',
      'CAPTAIN': '1495801714476060672',
      'COMMANDER': '1495801714937167962',
      'LSPD DEPUTY CHIEF': '1493620509315698803',
      'LSPD CHIEF': '1493620507889897473'
    }
  },
  ems: {
    base: '1493620529309945876', // EMS
    ranks: {
      'EMS Chief': '1493620527238221984',
      'EMS Deputy Chief': '1493620528232005814',
      'EMS': '1493620529309945876',
      'Surgeon': '1493620531231064276',
      'Paramedic': '1493620530362974360',
      'Intern Doctor': '1493620532719910963',
      'Trainee': '1493620539950891010'
    }
  },
  mechanic: {
    base: '1493620542824124558', // Mechanic
    ranks: {
      'Mechanic Manager': '1493620541557571706',
      'Garage Manager': '1493620544107708477',
      'Asst Manager': '1493620544833191998',
      'Sr Mechanic': '1493620546418643086',
      'Jr Mechanic': '1493620547525808198',
      'Recruit': '1493620548834689075'
    }
  },
  doj: {
    base: '1538436985180397658', // Department of Chief Justice
    ranks: {
      'Chief Justice': '1529050716780367964',
      'Attorney General': '1530221577218687197',
      'Deputy Attorney General': '1534157824467144776',
      'District Attorney': '1534157856360763503',
      'Attorney': '1538436630073843813',
      'Legal Intern': '1534157877000933426'
    }
  }
};

// Channel IDs for new application notifications per department
const NEW_APPLICATION_CHANNELS = {
  police: '1493620877231915150', // LSPD applications channel
  ems: '1493620878938734662', // EMS applications channel
  mechanic: '1493620879798567035', // Mechanic applications channel
  doj: '1534530812731592840' // DOJ applications channel
};
// Optional fallback admin log channel (can be set via env var)
const ADMIN_LOG_CHANNEL = process.env.DISCORD_ADMIN_LOG_CHANNEL || NEW_APPLICATION_CHANNELS.police; // default to police channel

const GUILD_ID = process.env.DISCORD_GUILD_ID;

client.once('ready', (c) => {
  console.log(`🤖 Discord Bot logged in as ${c.user.tag}`);
});

/**
 * Assign roles to a user in the guild
 * @param {string} userId - Discord User ID
 * @param {string|string[]} roleIds - Single ID or Array of IDs
 */
async function assignGuildRole(userId, roleIds) {
  try {
    const guild = GUILD_ID 
      ? await client.guilds.fetch(GUILD_ID) 
      : client.guilds.cache.first();

    if (!guild) {
      console.error('❌ assignGuildRole: Guild not found. Check DISCORD_GUILD_ID env var.');
      return { success: false, error: 'Guild not found' };
    }

    // Verify bot has permission to manage roles
    const botMember = await guild.members.fetchMe();
    if (!botMember.permissions.has('MANAGE_ROLES')) {
      console.error('❌ assignGuildRole: Bot lacks MANAGE_ROLES permission.');
      return { success: false, error: 'Missing MANAGE_ROLES permission' };
    }

    let member = null;
    // Try by numeric ID first (most reliable)

      member = await guild.members.fetch({ user: userId, force: true }).catch((e) => {
        console.warn(`⚠️ Could not fetch member by ID ${userId}: ${e.message}`);
        return null;
      });
    }

    // Fallback: search by username
    if (!member) {
      console.log(`🔍 Searching member by username: ${userId}`);
      const members = await guild.members.fetch();
      member = members.find(m =>
        m.user.username.toLowerCase() === userId.toLowerCase() || 
        m.user.tag.toLowerCase() === userId.toLowerCase()
      );
    }

    if (!member) {
      console.error(`❌ assignGuildRole: Member '${userId}' not found in server. Are they in the Discord?`);
      return { success: false, error: 'Member not found in server' };
    }


    const idsToAdd = (Array.isArray(roleIds) ? roleIds : [roleIds])






          return false;
        }



          return false;
        }

      });

    if (idsToAdd.length === 0) {

      return { success: false, error: 'No valid role IDs provided' };
    }

    console.log(`⏳ Attempting to add roles [${idsToAdd.join(', ')}] to ${member.user.tag} (${member.user.id})...`);
    await member.roles.add(idsToAdd);
    console.log(`✅ Successfully assigned roles [${idsToAdd.join(', ')}] to ${member.user.tag}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to assign roles to '${userId}':`, error.message, '| Code:', error.code);
    return { success: false, error: error.message };
  }
}


















    


















  




    }
    










/**
 * Surgically remove only department-specific roles from a user
 * @param {string} userInfo - Discord ID or Username
 * @param {string} type - 'police', 'ems', or 'mechanic'
 */
async function removeDepartmentRoles(userInfo, type) {
  const typeKey = (type || '').toLowerCase();
  if (!userInfo || !typeKey || !DEPARTMENT_ROLES[typeKey]) return { success: false, error: 'Invalid parameters' };
  
  try {
    const guild = GUILD_ID 
      ? await client.guilds.fetch(GUILD_ID) 
      : client.guilds.cache.first();

    if (!guild) return { success: false, error: 'Guild not found' };

    let member = null;
    if (/^\d+$/.test(userInfo)) {
      member = await guild.members.fetch(userInfo).catch(() => null);
    }
    
    if (!member) {
      const members = await guild.members.fetch();
      member = members.find(m => 
        m.user.username.toLowerCase() === userInfo.toLowerCase() || 
        m.user.tag.toLowerCase() === userInfo.toLowerCase()
      );
    }

    if (!member) return { success: false, error: 'Member not found' };

    // Identify all roles that belong to this department
    const deptConfig = DEPARTMENT_ROLES[typeKey];
    let rolesToRemove = [];
    
    if (typeof deptConfig === 'string') {
      rolesToRemove = [deptConfig];
    } else {
      rolesToRemove = [deptConfig.base, ...Object.values(deptConfig.ranks || {})];
    }
    
    console.log(`⏳ Removing ${type} department roles from ${member.user.tag}...`);
    await member.roles.remove(rolesToRemove.filter(id => !!id));
    console.log(`✅ Surgically removed ${type} roles. Citizen role preserved.`);
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to remove department roles:`, error.message);
    return { success: false, error: error.message };
  }
}

// GIFs and Branding Images (Direct Image URLs for discord embeds)
const APPROVED_GIF = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/approved.png';
const REJECTED_GIF = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/rejected.png';
const SCHEDULED_GIF = 'https://gifdb.com/images/high/calendar-appointment-scheduling-8v7m3m8p9n5f9p5p.gif';

/**
 * Creates the standardized embed for both DM and Channel notifications
 */
function createStatusEmbed(type = '', status, name, discordId, metadata = {}) {
  const isApproved = status === 'approved';
  const isScheduled = status === 'scheduled';
  const isReceived = status === 'received';
  const lowType = (type || '').toLowerCase();
  const isCivilian = lowType === 'civilian' || lowType === 'whitelist';
  
  const typeLabel = isCivilian ? 'Whitelist' : type.charAt(0).toUpperCase() + type.slice(1);
  
  let gifUrl = isApproved ? APPROVED_GIF : isScheduled ? SCHEDULED_GIF : isReceived ? SCHEDULED_GIF : REJECTED_GIF;
  if (lowType === 'police') {
    if (isApproved) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/police_approved.png';
    } else if (!isScheduled) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/police_rejected.png';
    }
  } else if (lowType === 'mechanic') {
    if (isApproved) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/mechanic_approved.png';
    } else if (!isScheduled) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/mechanic_rejected.png';
    }
  } else if (lowType === 'ems') {
    if (isApproved) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/ems_approved.png';
    } else if (!isScheduled) {
      gifUrl = 'https://raw.githubusercontent.com/prasads6507/Dream_City_RP_S2/main/server/assets/ems_rejected.png';
    }
  } else if (lowType === 'doj') {
    if (isApproved) {
      gifUrl = APPROVED_GIF; // fallback since no custom DOJ gif is mentioned
    } else if (!isScheduled) {
      gifUrl = REJECTED_GIF;
    }
  }
  
  const statusEmoji = isApproved ? '✅' : isScheduled ? '🗓️' : isReceived ? '📬' : '❌';
  const statusText = isApproved ? 'APPROVED' : isScheduled ? 'SCHEDULED' : isReceived ? 'RECEIVED' : 'REJECTED';
  const color = isApproved ? 0x22c55e : isScheduled ? 0x06b6d4 : isReceived ? 0x6c3ce1 : 0xef4444;

  let description = `**${name}**, your **${typeLabel}** application for **Dream City RP** has been **${statusText}**.`;

  if (isApproved) {
    const rankText = metadata.jobRank ? ` as a **${metadata.jobRank}**` : '';
    description = `**${name}**! Your **${typeLabel}** application for **Dream City RP** has been **APPROVED**${rankText}.\n\nWelcome to the team! 🎉`;
  } else if (isScheduled) {
    if (isCivilian) {
      description = `**${name}**, your application has reached the next stage! We have **SCHEDULED A WHITELIST INTERVIEW** for you.\n\nPlease be present in the **Waiting For Support**. Thank you Team DCRP S2`;
    } else {
      description = `**${name}**, your **${typeLabel}** application has reached the next stage! We have **SCHEDULED AN INTERVIEW** for you.\n\n📅 **Date**: ${metadata.interviewDate}\n⏰ **Time**: ${metadata.interviewTime || 'TBD'}\n\nPlease be present in the waiting room at the scheduled time.`;
    }
  } else if (isReceived) {
    description = `**${name}**, your **${typeLabel}** application has been successfully **RECEIVED** and is currently under review by our team. We will update you soon!`;
  } else {
    description = `**${name}**, we regret to inform you that your **${typeLabel}** application has been **REJECTED**. You may reapply in the future.`;
  }

  const fields = [
    { name: '👤 Applicant', value: `<@${discordId}>`, inline: true },
    { name: '📋 Department', value: typeLabel, inline: true },
    { name: '📌 Status', value: statusText, inline: true }
  ];

  if (isApproved && metadata.jobRank) {
    fields.push({ name: '🎖️ Position', value: metadata.jobRank, inline: true });
  }

  if (isScheduled && !isCivilian && metadata.interviewDate) {
    fields.push({ name: '📅 Interview', value: `${metadata.interviewDate} @ ${metadata.interviewTime || 'TBD'}`, inline: false });
  }

  if (metadata.adminMessage) {
    fields.push({ name: '📝 Message from Admin', value: metadata.adminMessage, inline: false });
  }

  return {
    title: `${statusEmoji} ${isCivilian ? 'Whitelist Interview' : `${typeLabel} Application`} ${isReceived ? 'RECEIVED' : statusText}`,
    description: description,
    color: color,
    fields: fields,
    image: { url: gifUrl },
    footer: { text: 'Dream City Roleplay • Recruitment System' },
    timestamp: new Date().toISOString()
  };
}

/**
 * Send a DM to a user by their Discord ID
 * @param {string} discordId - The user ID or username#1234 (ID is more reliable)
 * @param {string} status - 'approved', 'rejected', or 'scheduled'
 * @param {string} name - Player name for personalization
 * @param {Object} metadata - Optional interview/rank details
 */
async function sendStatusDM(discordId, status, name, type = 'Whitelist', metadata = {}) {
  try {
    let user = null;
    if (/^\d+$/.test(discordId)) {
      user = await client.users.fetch(discordId).catch(() => null);
    }
    
    if (!user) {
      const guild = GUILD_ID ? await client.guilds.fetch(GUILD_ID).catch(() => null) : client.guilds.cache.first();
      if (guild) {
        const members = await guild.members.fetch();
        const member = members.find(m => 
          m.user.username.toLowerCase() === discordId.toLowerCase() || 
          m.user.tag.toLowerCase() === discordId.toLowerCase()
        );
        if (member) user = member.user;
      }
    }
    
    if (!user) {
      console.warn(`⚠️ User not found for ID/Username: ${discordId}`);
      return { success: false, error: 'User not found' };
    }

    const embed = createStatusEmbed(type, status, name, discordId, metadata);
    await user.send({ embeds: [embed] });
    
    console.log(`✉️ DM Embed sent to ${user.tag} (${status})`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send DM to ${discordId}:`, error.message);
    if (error.code === 50007) {
      return { success: false, error: 'Cannot send messages to this user (DMs disabled)' };
    }
    return { success: false, error: error.message };
  }
}

// Department Channel IDs (for approved/rejected notifications)
const DEPARTMENT_CHANNELS = {
  civilian: '1497311768832249886',
  whitelist: '1497311768832249886',
  police: '1493620877231915150',
  ems: '1493620878938734662',
  mechanic: '1493620879798567035',
  doj: '1498015267987521616'
};

// Duplicate channel definitions removed

/**
 * Send a notification to the department-specific Discord channel
 * @param {string} type - 'police', 'ems', 'mechanic', or 'civilian'
 * @param {string} status - 'approved', 'rejected', or 'scheduled'
 * @param {string} name - Applicant name
 * @param {string} discordId - Applicant Discord ID
 * @param {Object} metadata - Optional interview/rank details
 */
async function sendChannelNotification(type, status, name, discordId, metadata = {}) {
  try {
    const typeKey = (type || '').toLowerCase();
    const channelId = DEPARTMENT_CHANNELS[typeKey];
    if (!channelId) {
      console.log(`ℹ️ No channel configured for type: ${type}, skipping channel notification.`);
      return { success: false, error: 'No channel for this department' };
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`❌ Could not find channel: ${channelId}`);
      return { success: false, error: 'Channel not found' };
    }

    const embed = createStatusEmbed(type, status, name, discordId, metadata);
    let content = undefined;
    if (type && type.toLowerCase() === 'doj') {
      content = '<@&1534530812731592840>';
    }
    
    await channel.send({ 
      content, 
      embeds: [embed],
      allowedMentions: { parse: ['users', 'roles'] }
    });
    
    console.log(`📢 Channel notification sent to #${channel.name} for ${name} (${status})`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send channel notification:`, error.message);
    return { success: false, error: error.message };
  }
}

// Log in the bot
if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN !== 'YOUR_DISCORD_BOT_TOKEN') {
  client.login(process.env.DISCORD_BOT_TOKEN);
} else {
  console.warn('⚠️ DISCORD_BOT_TOKEN not configured. Bot will not start.');
}

/**
 * Send a notification to the new applications Discord channel when an application is submitted
 * @param {string} name - Applicant name
 * @param {string} discordId - Applicant Discord ID
 * @param {string} type - Application type
 */
async function sendNewApplicationNotification(name, discordId, type) {
  try {
    const typeKey = (type || '').toLowerCase();
    
    // Route to the correct department channel, fallback to admin log
    const channelId = NEW_APPLICATION_CHANNELS[typeKey] || ADMIN_LOG_CHANNEL;
    console.log(`📡 Routing new ${typeKey} application notification to channel: ${channelId}`);

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`❌ Could not find channel: ${channelId}`);
      return { success: false, error: 'Channel not found' };
    }

    const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    
    const embed = {
      title: '📋 New Application Received',
      description: `We have received the **${typeLabel}** application of **${name}** (<@${discordId}>).\n\n⏳ Please review it in the admin dashboard.`,
      color: 0x6c3ce1, // Purple accent color
      fields: [
        { name: '👤 Applicant', value: name, inline: true },
        { name: '🎮 Discord ID', value: `<@${discordId}>`, inline: true },
        { name: '📋 Department', value: typeLabel, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Dream City Roleplay S2 — Whitelist System' }
    };

    // Mention relevant role for staff to notice it
    let content = undefined;
    if (typeKey === 'doj') {
      content = '<@&1534530579209654423>';
    } else if (typeKey === 'police') {
      content = '<@&1493620510465200230>'; // Police base role
    } else if (typeKey === 'ems') {
      content = '<@&1493620529309945876>'; // EMS base role
    } else if (typeKey === 'mechanic') {
      content = '<@&1493620542824124558>'; // Mechanic base role
    }

    await channel.send({ 
      content, 
      embeds: [embed],
      allowedMentions: { parse: ['users', 'roles'] }
    });
    console.log(`📢 New application notification sent to #${channel.name} for ${name} (${typeKey})`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send new application notification:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Log staff actions taken from the website (txAdmin actions)
 */
async function sendStaffActionLog(staffName, action, targetName, targetId, reason = '') {
  try {
    const channelId = '1498015267987521616'; // Using the same admin log channel
    const channel = await client.channels.fetch(channelId);
    if (!channel) return { success: false };

    const embed = {
      title: '🛡️ Website Admin Action',
      color: 0xf59e0b, // Amber
      fields: [
        { name: '👤 Staff Member', value: staffName, inline: true },
        { name: '🎮 Action', value: action.toUpperCase(), inline: true },
        { name: '🎯 Target', value: `${targetName} (ID: ${targetId})`, inline: false },
        { name: '📝 Reason/Detail', value: reason || 'N/A', inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Dream City RP — Staff Audit Log' }
    };

    await channel.send({ embeds: [embed] });
    return { success: true };
  } catch (err) {
    console.error('Failed to log staff action:', err.message);
    return { success: false };
  }
}

module.exports = { 
  sendStatusDM, 
  assignGuildRole, 
  removeDepartmentRoles, 
  sendChannelNotification,
  sendNewApplicationNotification,
  sendStaffActionLog,
  DEPARTMENT_ROLES,
  client
};
