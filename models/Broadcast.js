const mongoose = require('mongoose');

const BroadcastSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:    { type: String, required: true },       // Final AI-formatted message
  groupIds:   [{ type: String }],                      // Target group JIDs
  groupNames: [{ type: String }],
  sentCount:  { type: Number, default: 0 },           // Successfully delivered
  failCount:  { type: Number, default: 0 },
  language:   { type: String, default: 'none' },      // Translation language used
  sentAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Broadcast', BroadcastSchema);
