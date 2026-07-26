const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const OTP      = require('../models/OTP');
const { sendOTPEmail } = require('../services/mailer');
const { requireGuest } = require('../middleware/auth');
const { setBotOwner }  = require('../services/whatsapp');

// ── Helper: generate 6-digit OTP ─────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────────────────────────
// GET /signup
// ─────────────────────────────────────────────────────────────────
router.get('/signup', requireGuest, (req, res) => {
  res.render('signup', { error: null, values: {} });
});

// ─────────────────────────────────────────────────────────────────
// POST /signup
// ─────────────────────────────────────────────────────────────────
router.post('/signup', requireGuest, async (req, res) => {
  const { name, email, username, password } = req.body;
  const values = { name, email, username };

  try {
    // Validate inputs
    if (!name || !email || !username || !password) {
      return res.render('signup', { error: 'All fields are required.', values });
    }
    if (password.length < 8) {
      return res.render('signup', { error: 'Password must be at least 8 characters.', values });
    }

    // Check for existing users
    const existingEmail    = await User.findOne({ email: email.toLowerCase() });
    const existingUsername = await User.findOne({ username: username.toLowerCase() });

    if (existingEmail)    return res.render('signup', { error: 'This email is already registered.', values });
    if (existingUsername) return res.render('signup', { error: 'Username is taken. Try another.', values });

    // Generate OTP and store pending user data
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase() }); // clear old OTPs
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      userData: { name, email: email.toLowerCase(), username: username.toLowerCase(), password }
    });

    // Send styled email
    await sendOTPEmail(email, name, otp);
    console.log(`[AUTH] OTP sent to ${email}: ${otp}`); // visible in dev logs only

    // Store email in session for /verify
    req.session.pendingEmail = email.toLowerCase();
    res.redirect('/verify');

  } catch (err) {
    console.error('[AUTH] Signup error:', err);
    res.render('signup', { error: 'Something went wrong. Please try again.', values });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /verify
// ─────────────────────────────────────────────────────────────────
router.get('/verify', (req, res) => {
  if (!req.session.pendingEmail) return res.redirect('/signup');
  res.render('verify', { error: null, email: req.session.pendingEmail });
});

// ─────────────────────────────────────────────────────────────────
// POST /verify
// ─────────────────────────────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { otp } = req.body;
  const email   = req.session.pendingEmail;

  if (!email) return res.redirect('/signup');

  try {
    const record = await OTP.findOne({ email });

    if (!record) {
      return res.render('verify', { error: 'OTP expired or not found. Please sign up again.', email });
    }
    if (record.otp !== otp.trim()) {
      return res.render('verify', { error: 'Incorrect code. Please try again.', email });
    }

    // OTP valid → create the actual user
    const { name, username, password } = record.userData;
    const user = await User.create({ name, email, username, password, isVerified: true });

    // Clean up OTP record
    await OTP.findOneAndDelete({ email });
    delete req.session.pendingEmail;

    // Log in immediately
    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.name     = user.name;

    // Assign this user as the WhatsApp bot owner
    setBotOwner(user._id.toString());

    res.redirect('/dashboard');

  } catch (err) {
    console.error('[AUTH] Verify error:', err);
    res.render('verify', { error: 'Verification failed. Please try again.', email });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /login
// ─────────────────────────────────────────────────────────────────
router.get('/login', requireGuest, (req, res) => {
  res.render('login', { error: null });
});

// ─────────────────────────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────────────────────────
router.post('/login', requireGuest, async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { error: 'Invalid email or password.' });
    }
    if (!user.isVerified) {
      return res.render('login', { error: 'Please verify your email before logging in.' });
    }

    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.name     = user.name;

    // Keep bot owner in sync
    setBotOwner(user._id.toString());

    res.redirect('/dashboard');

  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.render('login', { error: 'Login failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /logout
// ─────────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
