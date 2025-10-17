import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

const router = express.Router();
router.use(cors());
router.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, "./assets/logo.png");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      // Path to your Firebase service account key JSON
      path.join(__dirname, 'serviceAccountKey.json')
    )
  });
}

const db = getFirestore();
// utility to generate random strong password
function generatePassword(length = 10) {
  return crypto.randomBytes(length)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}

router.post('/send', async (req, res) => {
  const { toEmail, toUserName, requestId, type } = req.body;
  // type = "staff" or "driver"

  if (!toEmail || !toUserName || !requestId || !type) {
    return res.status(400).json({ success: false, message: "Email, requestId and type are required" });
  }

  // generate password
  const newPassword = generatePassword(12);
  const passwordHash = await bcrypt.hash(newPassword, 10);

  try {
    // update Firestore
    const collectionName = type === "staff" ? "staffs" : "drivers";
    await db.collection(collectionName).doc(requestId).update({
      status: "approved",
      password: passwordHash
    });

    // send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stephenlwlhotmailcom@gmail.com',
        pass: 'eiau bqdb wkgj qbfl'
      }
    });

    await transporter.sendMail({
      from: '"AutoMate Admin" <stephenlwlhotmailcom@gmail.com>',
      to: toEmail,
      subject: 'Your AutoMate Account Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px; margin: auto; background: #fafafa;">
          <div style="text-align:center; margin-bottom:20px;">
            <img src="cid:logo" alt="AutoMate Logo" style="max-height:60px;">
          </div>
          <h2 style="color:#FF6B00; text-align:center; margin-bottom:20px;">Your AutoMate Login Password</h2>
          <p style="font-size:14px; color:#333; text-align:center;">
            Dear ${toUserName}, <br>
            A new password has been generated for your <b>AutoMate</b> account. Please use the password below to log in:
          </p>
          <div style="font-size:20px; font-weight:bold; color:#222; background:#fff; border:1px solid #FF6B00; padding:15px; text-align:center; margin:20px auto; width:fit-content; border-radius:6px;">
            ${newPassword}
          </div>
          <p style="font-size:13px; color:#666; text-align:center;">
            For security reasons, please change your password immediately after login.
          </p>
          
          <!-- Footer -->
          <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
          <p style="font-size:12px; color:#999; text-align:center;">
            © ${new Date().getFullYear()} Automate Repair Service Center. All rights reserved.<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
      `,
      attachments: [
        { filename: "logo.png", path: logoPath, cid: "logo" }
      ]
    });

    return res.json({ success: true, message: 'Password sent successfully' });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ success: false, error: 'Failed to send password' });
  }
});

export default router;
