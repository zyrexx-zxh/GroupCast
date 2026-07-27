/**
 * WhatsApp Client Service — Updated for Free Render Tier
 * Uses puppeteer with system chromium-browser
 * No persistent disk needed
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const Group                 = require('../models/Group');
const path                  = require('path');

let whatsappClient = null;
let botOwnerUserId = process.env.BOT_OWNER_USER_ID || null;

function getClient() {
  return whatsappClient;
}

function setBotOwner(userId) {
  botOwnerUserId = userId;
  console.log(`[WA] Bot owner set to userId: ${userId}`);
}

async function initWhatsApp(mongooseConnection) {
  console.log('[WA] Initializing WhatsApp client...');

  // LocalAuth stores session in ./.wwebjs_auth folder (ephemeral, but OK for testing)
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      executablePath: '/usr/bin/chromium-browser', // System chromium path
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync'
      ],
      headless: true
    }
  });

  // ── QR Code Event ────────────────────────────────────────────
  whatsappClient.on('qr', (qr) => {
    console.log('\n[WA] ══════════════════════════════════════════');
    console.log('[WA]  📱 Scan this QR code with your WhatsApp app');
    console.log('[WA] ══════════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
    console.log('[WA] ✨ Waiting for you to scan...\n');
  });

  // ── Ready Event ──────────────────────────────────────────────
  whatsappClient.on('ready', () => {
    console.log('[WA] ✅ WhatsApp client is ready and connected!');
    console.log('[WA] 🤖 Add your bot number to WhatsApp groups');
    console.log('[WA] 💬 Type "@bot setup" in any group to register it\n');
  });

  // ── Auth Failure ─────────────────────────────────────────────
  whatsappClient.on('auth_failure', (msg) => {
    console.error('[WA] ❌ Authentication failed:', msg);
  });

  // ── Disconnected ─────────────────────────────────────────────
  whatsappClient.on('disconnected', (reason) => {
    console.warn('[WA] ⚠️  Client disconnected:', reason);
    console.warn('[WA] ℹ️  Attempting to reconnect...');
  });

  // ── Message Listener — "@bot setup" command ──────────────────
  whatsappClient.on('message', async (msg) => {
    try {
      // Only handle group messages
      if (!msg.from.endsWith('@g.us')) return;

      const body = msg.body.trim().toLowerCase();
      
      // Only respond to @bot setup command
      if (body !== '@bot setup') return;

      if (!botOwnerUserId) {
        console.warn('[WA] "@bot setup" received but no bot owner set. Log in to GroupCast first.');
        return;
      }

      // Get group info and register it
      const chat = await msg.getChat();
      const groupId   = chat.id._serialized;
      const groupName = chat.name;

      // Upsert — safe to run multiple times
      await Group.findOneAndUpdate(
        { userId: botOwnerUserId, groupId },
        { userId: botOwnerUserId, groupId, groupName },
        { upsert: true, new: true }
      );

      // Reply to confirm setup
      await msg.reply(`✅ *GroupCast Setup Complete!*\n\n_${groupName}_ has been registered to your account. You can now broadcast messages to this group from the dashboard.`);
      console.log(`[WA] ✓ Registered group: "${groupName}" (${groupId})`);
    } catch (err) {
      console.error('[WA] Error processing @bot setup command:', err.message);
    }
  });

  // Initialize client
  try {
    await whatsappClient.initialize();
    console.log('[WA] Client initialization started. Scanning for QR...\n');
  } catch (err) {
    console.error('[WA] Initialization error:', err.message);
    console.error('[WA] Make sure chromium-browser is installed on the system');
  }
}

/**
 * Send a message to multiple group JIDs.
 * Returns { sent: number, failed: number }
 */
async function broadcastToGroups(groupIds, message) {
  if (!whatsappClient) {
    throw new Error('WhatsApp client not initialized');
  }

  let sent = 0, failed = 0;
  
  for (const gid of groupIds) {
    try {
      await whatsappClient.sendMessage(gid, message);
      sent++;
      console.log(`[WA] ✓ Message sent to ${gid}`);
      
      // 1.2 second delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`[WA] ✗ Failed to send to ${gid}:`, err.message);
      failed++;
    }
  }
  
  console.log(`[WA] Broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

module.exports = { initWhatsApp, getClient, broadcastToGroups, setBotOwner };
