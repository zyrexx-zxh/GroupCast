const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'live.smtp.mailtrap.io',
  port: 2525,
  secure: false,
  auth: {
    user: 'api',
    pass: '574cf94c5a88db7b053c617684981472'
  }
});

async function sendOTPEmail(to, name, otp) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{background:#0d0d0d;font-family:Inter,sans-serif;color:#e0e0e0}.wrapper{max-width:560px;margin:40px auto;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.1);border-radius:20px}.header{background:linear-gradient(135deg,#25d366,#128c7e);padding:36px 40px;text-align:center}.header h1{font-size:26px;font-weight:700;color:#fff}.body{padding:40px}.greeting{font-size:16px;color:#c8c8c8}.otp-box{margin:32px 0;background:rgba(37,211,102,0.08);border:1.5px solid rgba(37,211,102,0.3);border-radius:14px;padding:28px;text-align:center}.otp-code{font-size:52px;font-weight:700;letter-spacing:14px;color:#fff;margin:10px 0 0}.footer{background:rgba(0,0,0,0.25);padding:20px 40px;text-align:center;font-size:11px;color:#444}</style></head><body><div class="wrapper"><div class="header"><h1>📡 GroupCast</h1><p>WhatsApp Broadcasting</p></div><div class="body"><p class="greeting">Hey <strong>${name}</strong>,</p><div class="otp-box"><div style="font-size:11px;color:#25d366;font-weight:600">YOUR VERIFICATION CODE</div><div class="otp-code">${otp}</div><div style="font-size:12px;color:#888;margin-top:10px">Expires in 10 minutes</div></div></div><div class="footer">© 2026 GroupCast</div></div></body></html>`;

  try {
    await transporter.sendMail({
      from: 'noreply@example.com',
      to,
      subject: `${otp} is your GroupCast verification code`,
      html
    });
    console.log(`[MAIL] ✓ Sent to ${to}`);
  } catch (err) {
    console.error(`[MAIL] ✗ Failed to ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendOTPEmail };
