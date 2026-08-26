// Discord Webhook Integration
// Sends a notification to a Discord channel when a new whitelist application is submitted
// Replace the WEBHOOK_URL with your actual Discord webhook URL or add VITE_DISCORD_WEBHOOK_URL to .env.local

const WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL';

/**
 * Send a notification to Discord about a new whitelist application
 * @param {Object} applicationData - The submitted application data
 * @param {Object} userData - The user who submitted the application
 */
export const sendWebhookNotification = async (applicationData, userData) => {
  // Skip if webhook URL is not configured
  if (!WEBHOOK_URL || WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL') {
    console.log('Discord webhook not configured — skipping notification');
    return;
  }

  try {
    const embed = {
      title: '📋 New Whitelist Application',
      color: 0x6c3ce1, // Purple accent color
      fields: [
        { name: '👤 Applicant', value: userData.name || 'Unknown', inline: true },
        { name: '📧 Email', value: userData.email || 'Unknown', inline: true },
        { name: '🎮 Discord', value: userData.discordUsername || 'Unknown', inline: true },
        { name: '📅 Age', value: String(applicationData.age), inline: true },
        { name: '🎭 RP Experience', value: applicationData.rpExperience.substring(0, 200), inline: false },
        { name: '📝 Status', value: '⏳ Pending Review', inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Dream City Roleplay S2 — Whitelist System' }
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Dream City RP — Whitelist Bot',
        avatar_url: '',
        embeds: [embed]
      })
    });
  } catch (error) {
    // Non-critical — log and continue
    console.error('Failed to send Discord webhook:', error);
  }
};
