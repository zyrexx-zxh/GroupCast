# 📡 GroupCast — B2B WhatsApp Group Broadcasting SaaS

> Send AI-formatted, optionally bilingual messages to multiple WhatsApp groups in one click.

---

## File Structure

```
groupcast/
├── server.js                   ← App entry point (start here)
├── package.json
├── .env.example                ← Copy to .env and fill in
├── render.yaml                 ← Render deployment config
│
├── models/
│   ├── User.js                 ← User accounts
│   ├── OTP.js                  ← Temporary OTP records (TTL 10 min)
│   ├── Group.js                ← Registered WhatsApp groups
│   └── Broadcast.js            ← Analytics / broadcast history
│
├── routes/
│   ├── auth.js                 ← Signup, OTP verify, login, logout
│   └── dashboard.js            ← Dashboard, broadcast, API endpoints
│
├── middleware/
│   └── auth.js                 ← Session guards
│
├── services/
│   ├── mailer.js               ← Nodemailer + styled HTML email
│   ├── gemini.js               ← Google Gemini AI formatting + translation
│   └── whatsapp.js             ← whatsapp-web.js + wwebjs-mongo session
│
└── views/                      ← EJS templates
    ├── signup.ejs
    ├── verify.ejs
    ├── login.ejs
    ├── dashboard.ejs
    └── 404.ejs

public/
├── css/
│   ├── auth.css                ← Glassmorphism auth pages
│   └── dashboard.css           ← Full dashboard layout
└── js/
    └── dashboard.js            ← Client-side interactivity
```

---

## Local Setup

```bash
# 1. Clone / copy files
cd groupcast

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — fill in MONGO_URI, EMAIL_USER, EMAIL_PASS, GEMINI_API_KEY

# 4. Start
npm start
# OR for development with auto-reload:
npm run dev

# 5. Watch terminal for QR code → scan with WhatsApp

# 6. Open app
open http://localhost:3000
```

---

## Gmail App Password Setup

1. Enable 2FA on your Google account
2. Go to **Google Account → Security → App passwords**
3. Generate a password for "Mail" → "Other (custom name)"
4. Paste the 16-char password into `EMAIL_PASS` in `.env` (spaces are fine)

---

## WhatsApp Bot Setup Flow

1. Start the server → QR code prints in terminal
2. Open WhatsApp on your phone → **Linked Devices → Link a Device**
3. Scan the QR code
4. Add the bot's number to any WhatsApp group
5. In that group, type exactly: `@bot setup`
6. The bot replies confirming registration
7. Refresh your GroupCast dashboard — the group appears in the list

> The session is stored in MongoDB via **wwebjs-mongo**, so it survives Render restarts.

---

## Deploying to Render

### 1. Puppeteer on Render (Required)

Render's Linux environment needs additional packages for Chromium. Add a **build script** or use a `Dockerfile`:

**Option A — Shell command in Render dashboard (Build Command):**
```
apt-get install -y chromium-browser fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils && npm install
```

**Option B — Add to package.json `postinstall`:**
```json
"scripts": {
  "postinstall": "npx puppeteer browsers install chrome",
  "start": "node server.js"
}
```

### 2. Environment Variables in Render Dashboard

Set these in **Render → Your Service → Environment**:
- `MONGO_URI` — your MongoDB Atlas connection string
- `EMAIL_USER` — Gmail address
- `EMAIL_PASS` — Gmail App Password
- `GEMINI_API_KEY` — Google AI Studio key
- `SESSION_SECRET` — any long random string
- `NODE_ENV` — `production`

### 3. Deploy

```bash
git init && git add . && git commit -m "Initial GroupCast deploy"
# Connect repo to Render → it will auto-deploy
```

> **Important:** After deploy, the QR code appears in **Render → Logs**. Scan it once. The session is then stored in MongoDB permanently.

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/signup` | Guest | Signup form |
| POST | `/signup` | Guest | Creates OTP, sends email |
| GET | `/verify` | Guest | OTP form |
| POST | `/verify` | Guest | Validates OTP, creates user |
| GET | `/login` | Guest | Login form |
| POST | `/login` | Guest | Authenticates user |
| GET | `/logout` | User | Destroys session |
| GET | `/dashboard` | User | Main dashboard |
| POST | `/broadcast` | User | AI format + send |
| POST | `/api/preview` | User | AI format only, no send |
| GET | `/api/groups` | User | Fetch registered groups |
| GET | `/api/stats` | User | Fetch analytics |

---

## Features

- ✅ Email OTP verification with styled HTML email
- ✅ WhatsApp session persisted in MongoDB (Render-safe)
- ✅ `@bot setup` auto-registers groups to your account
- ✅ Google Gemini AI message formatting with WhatsApp markdown
- ✅ Bilingual translation (Hindi / English) appended after `---`
- ✅ Smart templates (Holiday, Meeting, Reminder, etc.)
- ✅ Real-time broadcast analytics
- ✅ Dark glassmorphism UI
- ✅ Session cookies stored in MongoDB
