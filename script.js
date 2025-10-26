import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Temporary store for verification codes (use DB in production)
const codes = {};
const OTP_TTL = 2 * 60 * 1000; // 2 minutes validity

// Gmail transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ---------- ROUTES ----------

// 🔹 Route 1: Send verification code
app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.json({ ok: false, error: "Email is required." });
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000);

  // Save with expiration
  codes[email] = { code, expiresAt: Date.now() + OTP_TTL };

  // Mail options (plain professional style)
  const mailOptions = {
    from: `"Raizian Studio" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Raizian Email Verification",
    text: `Hello,

Thank you for signing up with Raizian Studio.

Your verification code is: ${code}

This code will expire in ${Math.round(OTP_TTL / 1000 / 60)} minute(s).

If you did not request this, please ignore this email.

— Raizian Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification code sent to ${email}: ${code}`);
    res.json({ ok: true, message: "Verification code sent successfully." });
  } catch (error) {
    console.error("Error sending mail:", error);
    res.json({ ok: false, error: "Failed to send verification email." });
  }
});

// 🔹 Route 2: Verify code
app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.json({ ok: false, error: "Email and code are required." });
  }

  const entry = codes[email];
  if (!entry) {
    return res.json({ ok: false, error: "No verification code found. Please request a new one." });
  }

  if (Date.now() > entry.expiresAt) {
    delete codes[email];
    return res.json({ ok: false, error: "Verification code expired. Please request again." });
  }

  if (String(entry.code) !== String(code)) {
    return res.json({ ok: false, error: "Invalid verification code." });
  }

  delete codes[email];
  res.json({ ok: true, message: "Email verified successfully!" });
});

// 🔹 Root route
app.get("/", (req, res) => {
  res.send("✅ Raizian Email Verification API is running.");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server live on port ${PORT}`);
});
