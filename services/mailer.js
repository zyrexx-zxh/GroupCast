const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Gmail App Password
  }
});

/**
 * Send a styled OTP verification email.
 * @param {string} to - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp  - 6-digit OTP
 */
async function sendOTPEmail(to, name, otp) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Verify your GroupCast account</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0d0d0d; font-family:'Inter',sans-serif; color:#e0e0e0; }
  .wrapper { max-width:560px; margin:40px auto; background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)); border:1px solid rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#25d366,#128c7e); padding:36px 40px; text-align:center; }
  .header h1 { font-size:26px; font-weight:700; color:#fff; letter-spacing:-0.5px; }
  .header p  { color:rgba(255,255,255,0.75); font-size:13px; margin-top:4px; }
  .body { padding:40px; }
  .greeting { font-size:16px; color:#c8c8c8; line-height:1.6; }
  .greeting strong { color:#fff; }
  .otp-box { margin:32px 0; background:rgba(37,211,102,0.08); border:1.5px solid rgba(37,211,102,0.3); border-radius:14px; padding:28px; text-align:center; }
  .otp-label { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#25d366; font-weight:600; }
  .otp-code  { font-size:52px; font-weight:700; letter-spacing:14px; color:#fff; margin:10px 0 0; font-variant-numeric:tabular-nums; }
  .otp-note  { font-size:12px; color:#888; margin-top:10px; }
  .divider { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:28px 0; }
  .footer-text { font-size:12px; color:#555; line-height:1.8; }
  .footer-text a { color:#25d366; text-decoration:none; }
  .footer { background:rgba(0,0,0,0.25); padding:20px 40px; text-align:center; font-size:11px; color:#444; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📡 GroupCast</h1>
    <p>WhatsApp Group Broadcasting Platform</p>
  </div>
  <div class="body">
    <p class="greeting">Hey <strong>${name}</strong>,</p>
    <p class="greeting" style="margin-top:12px;">
      Welcome aboard! Use the one-time code below to verify your email and activate your GroupCast account.
    </p>
    <div class="otp-box">
      <div class="otp-label">Your verification code</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-note">Expires in <strong>10 minutes</strong> · Do not share this code</div>
    </div>
    <hr class="divider" />
    <p class="footer-text">
      If you didn't create a GroupCast account, you can safely ignore this email.<br/>
      Need help? <a href="mailto:${process.env.EMAIL_USER}">Contact support</a>
    </p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} GroupCast · All rights reserved</div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"GroupCast" <${process.env.EMAIL_USER}>`,
    to,
    subject: `${otp} is your GroupCast verification code`,
    html
  });
}

module.exports = { sendOTPEmail };
