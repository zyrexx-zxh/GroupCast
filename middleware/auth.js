// Protect routes — redirect to login if not authenticated
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.redirect('/login');
}

// Redirect logged-in users away from auth pages
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  next();
}

module.exports = { requireAuth, requireGuest };
