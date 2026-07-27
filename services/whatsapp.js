const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const Group                 = require('../models/Group');

let whatsappClient = null;
let botOwnerUserId = null;

function getClient() {
  return whatsappClient;
}

function setBotOwner(userId) {
  botOwnerUserId = userId;
  console.log(`[WA] Bot owner set to: ${userId}`);
}

async function initWhatsApp(mongooseConnection) {
  console.log('[WA] Starting WhatsApp initialization...');
  
  try {
    whatsappClient = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true }
    });

    whatsappClient.on('qr', (qr) => {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║  SCAN THIS QR CODE WITH WHATSAPP          ║');
      console.log('╚════════════════════════════════════════════╝\n');
      qrcode.generate(qr, { small: true });
      console.log('\n✓ QR code generated. Scan with your phone.\n');
    });

    whatsappClient.on('ready', () => {
      console.log('[WA] ✅ WhatsApp connected and ready!\n');
    });

    whatsappClient.on('message', async (msg) => {
      if (!msg.from.endsWith('@g.us')) return;
      if (msg.body.toLowerCase().trim() !== '@bot setup') return;
      if (!botOwnerUserId) return;

      try {
        const chat = await msg.getChat();
        await Group.findOneAndUpdate(
          { userId: botOwnerUserId, groupId: chat.id._serialized },
          { userId: botOwnerUserId, groupId: chat.id._serialized, groupName: chat.name },
          { upsert: true }
        );
        await msg.reply(`✅ Group registered!`);
        console.log(`[WA] Group added: ${chat.name}`);
      } catch (e) {
        console.error('[WA] Error:', e.message);
      }
    });

    await whatsappClient.initialize();
  } catch (err) {
    console.error('[WA] Error:', err.message);
  }
}

async function broadcastToGroups(groupIds, message) {
  if (!whatsappClient) throw new Error('Not initialized');
  let sent = 0, failed = 0;
  for (const gid of groupIds) {
    try {
      await whatsappClient.sendMessage(gid, message);
      sent++;
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      failed++;
    }
  }
  return { sent, failed };
}

module.exports = { initWhatsApp, getClient, broadcastToGroups, setBotOwner };
