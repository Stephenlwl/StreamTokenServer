import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
router.use(cors());
router.use(express.json());

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, "./assets/logo.png");

// Vehicle Approval Email
router.post('/vehicle-approved', async (req, res) => {
  const { toEmail, plateNumber, vehicle, ownerName } = req.body;
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stephenlwlhotmailcom@gmail.com',
        pass: 'eiau bqdb wkgj qbfl'
      }
    });

    await transporter.sendMail({
      from: '"AutoMate Vehicle Verification" <stephenlwlhotmailcom@gmail.com>',
      to: toEmail,
      subject: `Vehicle ${plateNumber} Approved - AutoMate System`,
      html: `
      <div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.6;">

        <div style="text-align:center; margin-bottom:20px;">
          <img src="cid:logo" alt="AutoMate Logo" style="max-height:60px;">
        </div>

        <p>Dear ${ownerName || 'Valued Customer'},</p>

        <p>We are pleased to inform you that your vehicle registration has been 
        <span style="color:#28a745; font-weight:bold;">approved successfully</span>.</p>

        <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:20px 0;">
          <h3 style="color:#2c3e50; margin-top:0;">Vehicle Details</h3>
          <p><strong>License Plate:</strong> ${plateNumber}</p>
          <p><strong>Vehicle:</strong> ${vehicle}</p>
          <p><strong>Status:</strong> <span style="color:#28a745; font-weight:bold;">APPROVED</span></p>
        </div>

        <p>Your vehicle is now fully registered in our system. You can now:</p>
        <ul>
          <li>Book service appointments</li>
          <li>Track maintenance history</li>
          <li>Receive personalized service recommendations</li>
          <li>Access exclusive vehicle management features</li>
        </ul>

        <p>You may log in to your account to start using these features immediately.</p>

        <div style="background:#e8f5e8; padding:15px; border-radius:5px; margin:20px 0;">
          <p style="margin:0; color:#155724;"><strong>Next Steps:</strong> Your vehicle is ready for service bookings!</p>
        </div>

        <p style="margin-top:20px;">Best regards,<br>
        <b>The Automate Repair Service Center System Team</b></p>

        <!-- Footer -->
        <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
        <p style="font-size:12px; color:#999; text-align:center;">
          © ${new Date().getFullYear()} Automate Repair Service Center System. All rights reserved.<br>
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
      `,
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logo"
        }
      ]
    });

    res.json({ success: true, message: 'Vehicle approval notification sent successfully' });
  } catch (err) {
    console.error('Vehicle approval email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send approval email' });
  }
});

// Vehicle Rejection Email
router.post('/vehicle-rejected', async (req, res) => {
  const { toEmail, plateNumber, vehicle, rejectionReason, ownerName } = req.body;
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stephenlwlhotmailcom@gmail.com',
        pass: 'eiau bqdb wkgj qbfl'
      }
    });

    await transporter.sendMail({
      from: '"AutoMate Vehicle Verification" <stephenlwlhotmailcom@gmail.com>',
      to: toEmail,
      subject: `Vehicle ${plateNumber} Requires Additional Information`,
      html: `
        <div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.6;">

          <div style="text-align:center; margin-bottom:20px;">
            <img src="cid:logo" alt="AutoMate Logo" style="max-height:60px;">
          </div>

          <p>Dear ${ownerName || 'Valued Customer'},</p>

          <p>Thank you for submitting your vehicle for registration with <b>AutoMate Vehicle Management System</b>. 
          After careful review, we require additional information or clarification regarding your vehicle registration.</p>

          <div style="background:#fff3f3; padding:15px; border-radius:8px; margin:20px 0;">
            <h3 style="color:#2c3e50; margin-top:0;">Vehicle Details</h3>
            <p><strong>License Plate:</strong> ${plateNumber}</p>
            <p><strong>Vehicle:</strong> ${vehicle}</p>
          </div>

          <p><strong>Reason for review:</strong></p>
          <blockquote style="border-left:4px solid #d9534f; margin:15px 0; padding:10px 15px; background:#f9f9f9; color:#555; font-style:italic;">
            ${rejectionReason || 'Additional documentation or clarification is required.'}
          </blockquote>

          <p><strong>What you need to do:</strong></p>
          <ol>
            <li>Review the reason mentioned above</li>
            <li>Log in to your AutoMate account</li>
            <li>Navigate to "My Vehicles" section</li>
            <li>Update your vehicle information as needed</li>
            <li>Resubmit for approval</li>
          </ol>

          <div style="background:#fff3cd; padding:15px; border-radius:5px; margin:20px 0;">
            <p style="margin:0; color:#856404;"><strong>Note:</strong> Common issues include unclear document photos, 
            mismatched plate number information, or incomplete vehicle details.</p>
          </div>

          <p>If you need assistance or have questions about the requirements, please contact our support team at 
          <a href="mailto:automate@support.com">automate@support.com</a></p>

          <p style="margin-top:20px;">Best regards,<br>
          <b>The Automate Repair Service Center System Team</b></p>

          <!-- Footer -->
          <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
          <p style="font-size:12px; color:#999; text-align:center;">
            © ${new Date().getFullYear()} Automate Repair Service Center System. All rights reserved.<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "logo.png",
          path: logoPath,
          cid: "logo"
        }
      ]
    });

    res.json({ success: true, message: 'Vehicle rejection notification sent successfully' });
  } catch (err) {
    console.error('Vehicle rejection email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send rejection email' });
  }
});

export default router;