const mongoose = require('mongoose');

// OTP expires after 10 minutes via MongoDB TTL index
const OTPSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  otp:       { type: String, required: true },
  userData:  { type: Object, required: true }, // Temp store pending user data
  createdAt: { type: Date, default: Date.now, expires: 600 } // 10 min TTL
});

module.exports = mongoose.model('OTP', OTPSchema);
