const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const Group                 = require('../models/Group');

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

  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
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

  whatsappClient.on('qr', (qr) => {
    console.log('\n[WA] ══════════════════════════════════════════');
    console.log('[WA]  Scan this QR code with your WhatsApp app');
    console.log('[WA] ══════════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
  });

  whatsappClient.on('ready', () => {
    console.log('[WA] ✅ WhatsApp client is ready and connected!');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('[WA] ❌ Authentication failed:', msg);
  });

  whatsappClient.on('disconnected', (reason) => {
    console.warn('[WA] ⚠️  Client disconnected:', reason);
  });

  whatsappClient.on('message', async (msg) => {
    if (!msg.from.endsWith('@g.us')) return;

    const body = msg.body.trim().toLowerCase();
    if (body !== '@bot setup') return;

    if (!botOwnerUserId) {
      console.warn('[WA] "@bot setup" received but no bot owner set.');
      return;
    }

    try {
      const chat = await msg.getChat();
      const groupId   = chat.id._serialized;
      const groupName = chat.name;

      await Group.findOneAndUpdate(
        { userId: botOwnerUserId, groupId },
        { userId: botOwnerUserId, groupId, groupName },
        { upsert: true, new: true }
      );

      await msg.reply(`✅ *GroupCast Setup Complete!*\n\n_${groupName}_ has been registered to your account.`);
      console.log(`[WA] Registered group: "${groupName}" (${groupId})`);
    } catch (err) {
      console.error('[WA] Error registering group:', err.message);
    }
  });

  await whatsappClient.initialize();
}

async function broadcastToGroups(groupIds, message) {
  if (!whatsappClient) throw new Error('WhatsApp client not initialized');

  let sent = 0, failed = 0;
  for (const gid of groupIds) {
    try {
      await whatsappClient.sendMessage(gid, message);
      sent++;
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`[WA] Failed to send to ${gid}:`, err.message);
      failed++;
    }
  }
  return { sent, failed };
}

module.exports = { initWhatsApp, getClient, broadcastToGroups, setBotOwner };
