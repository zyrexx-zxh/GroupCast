/**
 * WhatsApp Client Service
 * ─────────────────────────────────────────────────────────────────
 * Uses whatsapp-web.js with wwebjs-mongo for persistent MongoDB auth.
 * This ensures the WhatsApp session survives Render's ephemeral restarts.
 *
 * HOW TO USE:
 * 1. Call initWhatsApp(mongoose.connection) after DB connects.
 * 2. Scan the QR code printed in your terminal.
 * 3. Add the bot number to your WhatsApp groups.
 * 4. Type "@bot setup" in any group to register it.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const { MongoStore }        = require('wwebjs-mongo');
const qrcode                = require('qrcode-terminal');
const Group                 = require('../models/Group');

let whatsappClient = null;

// The userId whose account will own all registered groups.
// Set via BOT_OWNER_USER_ID in .env or dynamically after first login.
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

  // wwebjs-mongo stores session data in MongoDB instead of local disk
  const store = new MongoStore({ mongoose: mongooseConnection });

  whatsappClient = new Client({
    authStrategy: new LocalAuth({ store }),
    puppeteer: {
      // Required for Render / headless Linux environments
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true
    }
  });

  // ── QR Code ────────────────────────────────────────────────────
  whatsappClient.on('qr', (qr) => {
    console.log('\n[WA] ══════════════════════════════════════════');
    console.log('[WA]  Scan this QR code with your WhatsApp app');
    console.log('[WA] ══════════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
  });

  // ── Ready ───────────────────────────────────────────────────────
  whatsappClient.on('ready', () => {
    console.log('[WA] ✅ WhatsApp client is ready and connected!');
  });

  // ── Auth failure ────────────────────────────────────────────────
  whatsappClient.on('auth_failure', (msg) => {
    console.error('[WA] ❌ Authentication failed:', msg);
  });

  // ── Disconnected ────────────────────────────────────────────────
  whatsappClient.on('disconnected', (reason) => {
    console.warn('[WA] ⚠️  Client disconnected:', reason);
  });

  // ── Message listener — "@bot setup" command ─────────────────────
  whatsappClient.on('message', async (msg) => {
    // Only handle group messages
    if (!msg.from.endsWith('@g.us')) return;

    const body = msg.body.trim().toLowerCase();
    if (body !== '@bot setup') return;

    if (!botOwnerUserId) {
      console.warn('[WA] "@bot setup" received but no bot owner set. Log in to GroupCast first.');
      return;
    }

    try {
      const chat = await msg.getChat();
      const groupId   = chat.id._serialized;
      const groupName = chat.name;

      // Upsert — safe to run multiple times
      await Group.findOneAndUpdate(
        { userId: botOwnerUserId, groupId },
        { userId: botOwnerUserId, groupId, groupName },
        { upsert: true, new: true }
      );

      await msg.reply(`✅ *GroupCast Setup Complete!*\n\n_${groupName}_ has been registered to your account. You can now broadcast messages to this group from the dashboard.`);
      console.log(`[WA] Registered group: "${groupName}" (${groupId})`);
    } catch (err) {
      console.error('[WA] Error registering group:', err.message);
    }
  });

  await whatsappClient.initialize();
}

/**
 * Send a message to multiple group JIDs.
 * Returns { sent: number, failed: number }
 */
async function broadcastToGroups(groupIds, message) {
  if (!whatsappClient) throw new Error('WhatsApp client not initialized');

  let sent = 0, failed = 0;
  for (const gid of groupIds) {
    try {
      await whatsappClient.sendMessage(gid, message);
      sent++;
      // Small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`[WA] Failed to send to ${gid}:`, err.message);
      failed++;
    }
  }
  return { sent, failed };
}

module.exports = { initWhatsApp, getClient, broadcastToGroups, setBotOwner };
