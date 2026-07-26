const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupId:   { type: String, required: true },   // WhatsApp group JID
  groupName: { type: String, required: true },
  addedAt:   { type: Date, default: Date.now }
});

// Prevent duplicates per user
GroupSchema.index({ userId: 1, groupId: 1 }, { unique: true });

module.exports = mongoose.model('Group', GroupSchema);
