const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const OTP      = require('../models/OTP');
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

    // ✅ AUTO-VERIFY — Skip email, create user directly
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password,
      isVerified: true
    });

    // Log in immediately
    req.session.userId   = user._id;
    req.session.username = user.username;
    req.session.name     = user.name;

    // Assign this user as the WhatsApp bot owner
    setBotOwner(user._id.toString());

    console.log(`[AUTH] User created and auto-verified: ${user.email}`);
    res.redirect('/dashboard');

  } catch (err) {
    console.error('[AUTH] Signup error:', err);
    res.render('signup', { error: 'Something went wrong. Please try again.', values });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /verify (DEPRECATED — kept for backwards compatibility)
// ─────────────────────────────────────────────────────────────────
router.get('/verify', (req, res) => {
  // Auto-verify now, so redirect to signup or dashboard
  res.redirect('/signup');
});

// ─────────────────────────────────────────────────────────────────
// POST /verify (DEPRECATED — kept for backwards compatibility)
// ─────────────────────────────────────────────────────────────────
router.post('/verify', (req, res) => {
  res.redirect('/signup');
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
