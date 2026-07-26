const express   = require('express');
const router    = express.Router();
const { requireAuth } = require('../middleware/auth');
const Group     = require('../models/Group');
const Broadcast = require('../models/Broadcast');
const { formatAndTranslate } = require('../services/gemini');
const { broadcastToGroups }  = require('../services/whatsapp');

// ─────────────────────────────────────────────────────────────────
// GET /dashboard
// ─────────────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const [groups, recentBroadcasts, totalStats] = await Promise.all([
      Group.find({ userId }).sort({ addedAt: -1 }),
      Broadcast.find({ userId }).sort({ sentAt: -1 }).limit(5),
      Broadcast.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId.toString()) } },
        { $group: { _id: null, totalSent: { $sum: '$sentCount' }, totalCasts: { $sum: 1 } } }
      ])
    ]);

    const stats = totalStats[0] || { totalSent: 0, totalCasts: 0 };

    res.render('dashboard', {
      name: req.session.name,
      username: req.session.username,
      groups,
      recentBroadcasts,
      stats,
      error: null,
      success: null
    });

  } catch (err) {
    console.error('[DASH] Load error:', err);
    res.render('dashboard', {
      name: req.session.name,
      username: req.session.username,
      groups: [],
      recentBroadcasts: [],
      stats: { totalSent: 0, totalCasts: 0 },
      error: 'Failed to load dashboard data.',
      success: null
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /broadcast  — AI format → send → log analytics
// ─────────────────────────────────────────────────────────────────
router.post('/broadcast', requireAuth, async (req, res) => {
  const { groupIds, message, language } = req.body;
  const userId = req.session.userId;

  // Normalize groupIds to always be an array
  const targetIds = Array.isArray(groupIds) ? groupIds : (groupIds ? [groupIds] : []);

  if (!targetIds.length) {
    return res.json({ ok: false, error: 'Select at least one group.' });
  }
  if (!message || !message.trim()) {
    return res.json({ ok: false, error: 'Message cannot be empty.' });
  }

  try {
    // 1. AI format + optional translation
    const finalMessage = await formatAndTranslate(message.trim(), language || 'none');

    // 2. Fetch group names for the selected IDs
    const groupDocs  = await Group.find({ userId, groupId: { $in: targetIds } });
    const groupNames = groupDocs.map(g => g.groupName);

    // 3. Send via WhatsApp
    const { sent, failed } = await broadcastToGroups(targetIds, finalMessage);

    // 4. Log the broadcast for analytics
    await Broadcast.create({
      userId,
      message: finalMessage,
      groupIds: targetIds,
      groupNames,
      sentCount: sent,
      failCount: failed,
      language: language || 'none'
    });

    res.json({
      ok: true,
      sent,
      failed,
      preview: finalMessage,
      message: `Broadcast complete — delivered to ${sent} group${sent !== 1 ? 's' : ''}.${failed ? ` (${failed} failed)` : ''}`
    });

  } catch (err) {
    console.error('[BROADCAST] Error:', err);
    res.json({ ok: false, error: err.message || 'Broadcast failed. Check server logs.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/preview  — AI format only, no sending
// ─────────────────────────────────────────────────────────────────
router.post('/api/preview', requireAuth, async (req, res) => {
  const { message, language } = req.body;
  if (!message || !message.trim()) return res.json({ ok: false, error: 'No message provided.' });
  try {
    const preview = await formatAndTranslate(message.trim(), language || 'none');
    res.json({ ok: true, preview });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/groups  — used by frontend for live refresh
// ─────────────────────────────────────────────────────────────────
router.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const groups = await Group.find({ userId: req.session.userId }).sort({ addedAt: -1 });
    res.json({ ok: true, groups });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/stats  — live analytics endpoint
// ─────────────────────────────────────────────────────────────────
router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const uid = mongoose.Types.ObjectId.createFromHexString(req.session.userId.toString());

    const [agg, recent] = await Promise.all([
      Broadcast.aggregate([
        { $match: { userId: uid } },
        { $group: { _id: null, totalSent: { $sum: '$sentCount' }, totalCasts: { $sum: 1 }, totalFailed: { $sum: '$failCount' } } }
      ]),
      Broadcast.find({ userId: req.session.userId }).sort({ sentAt: -1 }).limit(5)
    ]);

    res.json({ ok: true, stats: agg[0] || { totalSent: 0, totalCasts: 0, totalFailed: 0 }, recent });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
