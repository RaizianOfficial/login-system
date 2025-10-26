require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const OTP_TTL = (process.env.OTP_TTL ? parseInt(process.env.OTP_TTL, 10) : 300) * 1000;

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('GMAIL_USER and GMAIL_APP_PASSWORD must be set.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const otps = new Map();

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

function generateOtp() {
  return ('' + (crypto.randomInt(0, 1000000))).padStart(6, '0');
}

app.post('/send-code', sendLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Invalid email' });

    const code = generateOtp();
    const expiresAt = Date.now() + OTP_TTL;
    otps.set(email, { code, expiresAt });

    const mailOptions = {
      from: `"Raizian" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Raizian Verification Code', // Refined Subject
      text: `Your verification code is: ${code}\nThis code will expire in ${Math.round(OTP_TTL / 1000)} seconds. For your security, please do not share this code.`, // Updated plain text fallback
      html: `
    <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 20px auto; padding: 25px; border: 1px solid #ddd; border-radius: 10px; background: #ffffff;">
        
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <img src="https://img.icons8.com/?size=100&id=GRvL5qjFn5Fh&format=png&color=000000" alt="Raizian Studio Logo" style="width: 90px; margin-bottom: 10px;"/>
          <h1 style="color:#111; margin: 0; font-size: 26px;">Raizian</h1>
        </div>

        <p style="font-size: 17px; margin-bottom: 20px;">Dear User,</p>
        <p style="font-size: 17px; margin-bottom: 25px;">Here is your One-Time Password (OTP) to complete your verification. Please use the code below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; background: #f0f0f0; color: #000; padding: 15px 30px; border-radius: 8px; letter-spacing: 4px; border: 1px solid #ccc;">
            ${code}
          </span>
        </div>

        <p style="font-size: 16px; text-align: center; margin-bottom: 10px;">
          This code will expire in <strong>${Math.round(OTP_TTL / 1000)} seconds</strong>.
        </p>
        <p style="font-size: 15px; text-align: center; color: #777;">
          For your security, <strong>please do not share this code</strong> with anyone.
        </p>

        <p style="font-size: 17px; margin-top: 35px;">
          Best regards,<br/>
          <strong>The Raizian Team 💗</strong>
        </p>

        <hr style="border:none; border-top:1px solid #eee; margin: 30px 0;"/>
        <p style="font-size:12px; color:#999; text-align:center;">
          If you did not request this code, you can safely ignore this email.
        </p>
    </div>
  `
    };





    await transporter.sendMail(mailOptions);
    return res.json({ ok: true, message: 'Code sent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send code' });
  }
});

app.post('/verify-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    const entry = otps.get(email);
    if (!entry) return res.status(400).json({ error: 'No code requested for this email' });

    if (Date.now() > entry.expiresAt) {
      otps.delete(email);
      return res.status(400).json({ error: 'Code expired' });
    }

    if (entry.code !== code) return res.status(400).json({ error: 'Incorrect code' });

    otps.delete(email);
    return res.json({ ok: true, message: 'Email verified — registration complete' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [email, { expiresAt }] of otps.entries()) {
    if (now > expiresAt) otps.delete(email);
  }
}, 60 * 1000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
