require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const session      = require('express-session');
const MongoStore   = require('connect-mongo');
const path         = require('path');

const { initWhatsApp } = require('./services/whatsapp');
const authRoutes       = require('./routes/auth');
const dashRoutes       = require('./routes/dashboard');

const app  = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('[DB] ✅ MongoDB connected');

    // Session store
    app.use(session({
      secret: process.env.SESSION_SECRET || 'groupcast_dev_secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      }
    }));

    // Routes
    app.use('/', authRoutes);
    app.use('/', dashRoutes);

    app.get('/', (req, res) => {
      res.redirect(req.session.userId ? '/dashboard' : '/login');
    });

    app.use((req, res) => {
      res.status(404).render('404');
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`[APP] ✅ Server running at http://localhost:${PORT}`);
    });

    // Initialize WhatsApp (no wwebjs-mongo, uses local storage)
    initWhatsApp(mongoose.connection).catch(err => {
      console.error('[WA] Init failed:', err.message);
    });
  })
  .catch(err => {
    console.error('[DB] ❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
