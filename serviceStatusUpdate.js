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

// Service Booking Status Updates
router.post('/service-booking-status', async (req, res) => {
  const { 
    toEmail, 
    customerName, 
    bookingId, 
    status, 
    scheduledDate, 
    scheduledTime,
    vehicleInfo,
    serviceCenterName,
    technicianName,
    bayNumber,
  } = req.body;
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stephenlwlhotmailcom@gmail.com',
        pass: 'eiau bqdb wkgj qbfl'
      }
    });

    const getStatusTemplate = () => {
      const statusConfig = {
        'confirmed': {
          subject: 'Service Booking Confirmed',
          color: '#28a745',
          title: 'Booking Confirmed',
          message: `Your service booking has been confirmed and scheduled. Our team is ready to serve you.`
        },
        'assigned': {
          subject: 'Technician Assigned to Your Service',
          color: '#007bff', 
          title: 'Technician Assigned',
          message: `Your vehicle has been assigned to our qualified technician. They will handle your service with expertise and care.`
        },
        'in_progress': {
          subject: 'Service In Progress',
          color: '#ffc107',
          title: 'Service Started',
          message: `Our technicians are now working on your vehicle. Once completed, we will notify you.`
        },
        'ready_for_collection': {
          subject: 'Your Vehicle is Ready for Collection',
          color: '#17a2b8',
          title: 'Ready for Collection',
          message: `Your vehicle service has been completed and is ready for collection. Please visit our service center to settle the payment and collect your vehicle.`
        },
        'invoice_generated': {
          subject: 'Invoice Generated for Your Service',
          color: '#6f42c1',
          title: 'Invoice Available',
          message: `Your service invoice has been generated and is now available for your review in the app.`
        },
        'completed': {
          subject: 'Service Completed - Receipt Available',
          color: '#6f42c1',
          title: 'Service Completed',
          message: `Your service has been completed successfully. You can now view the detailed receipt by searching for booking ${bookingId} in your service history section.`
        },
        'declined': {
          subject: 'Service Booking Declined',
          color: '#dc3545',
          title: 'Booking Declined',
          message: `We're unable to accommodate your service booking at this time. Please contact us for rescheduling.`
        }
      };

      return statusConfig[status] || {
        subject: 'Service Booking Update',
        color: '#6c757d',
        title: 'Status Updated',
        message: `Your service booking status has been updated.`
      };
    };

    const statusInfo = getStatusTemplate();

    await transporter.sendMail({
      from: `"${serviceCenterName}" <stephenlwlhotmailcom@gmail.com>`,
      to: toEmail,
      subject: statusInfo.subject,
      html: `
      <div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.6; max-width:600px; margin:0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #d9534f 0%, #f5576c 100%); padding:30px; text-align:center; color:white;">
          <img src="cid:logo" alt="AutoMate Logo" style="max-height:100px; margin-bottom:5px;">
          <h1 style="margin:10px 0; font-size:24px;">Service Booking Update</h1>
          <div style="background:${statusInfo.color}; padding:8px 16px; border-radius:20px; display:inline-block; font-weight:bold;">
            ${statusInfo.title}
          </div>
        </div>

        <!-- Content -->
        <div style="padding:30px; background:#f8f9fa;">
          <p>Dear <strong>${customerName}</strong>,</p>
          
          <div style="background:white; padding:20px; border-radius:8px; border-left:4px solid ${statusInfo.color}; margin:20px 0;">
            <p style="margin:0; font-size:16px;">${statusInfo.message}</p>
          </div>

          <!-- Booking Details -->
          <div style="background:white; padding:20px; border-radius:8px; margin:20px 0;">
            <h3 style="color:#333; margin-top:0;">Booking Details</h3>
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0; color:#666; width:40%;">Booking ID:</td>
                <td style="padding:8px 0; font-weight:bold;">${bookingId}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#666;">Vehicle:</td>
                <td style="padding:8px 0; font-weight:bold;">${vehicleInfo}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#666;">Scheduled:</td>
                <td style="padding:8px 0; font-weight:bold;">${scheduledDate} at ${scheduledTime}</td>
              </tr>
              ${technicianName ? `
              <tr>
                <td style="padding:8px 0; color:#666;">Technician:</td>
                <td style="padding:8px 0; font-weight:bold;">${technicianName}</td>
              </tr>
              ` : ''}
              ${bayNumber ? `
              <tr>
                <td style="padding:8px 0; color:#666;">Service Bay:</td>
                <td style="padding:8px 0; font-weight:bold;">${bayNumber}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Next Steps -->
          <div style="background:#d1ecf1; padding:15px; border-radius:8px; border-left:4px solid #17a2b8; margin:20px 0;">
            <h4 style="margin:0 0 10px 0; color:#0c5460;">Next Steps:</h4>
            <p style="margin:0; color:#0c5460;">
              ${status === 'ready_for_collection' 
                ? 'Please visit our service center to collect your vehicle. Bring your identification and payment method.' 
                : status === 'completed' 
                ? 'Your e-invoice is available in the app. Thank you for choosing our service!' 
                : 'You will receive further updates as your service progresses.'}
            </p>
          </div>

          <p style="margin-top:30px;">
            If you have any questions, please contact ${serviceCenterName} directly.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#343a40; padding:20px; text-align:center; color:white;">
          <p style="margin:0; font-size:12px;">
            © ${new Date().getFullYear()} ${serviceCenterName}. All rights reserved.<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
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

    res.json({ success: true, message: 'Service booking notification sent successfully' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send email notification' });
  }
});

// Towing Request Status Updates
router.post('/towing-request-status', async (req, res) => {
  const { 
    toEmail, 
    customerName, 
    requestId, 
    status, 
    vehicleInfo,
    pickupLocation,
    destination,
    estimatedArrival,
    driverInfo,
    driverVehicleInfo,
    towingType,
    serviceCenterName,
    notes 
  } = req.body;
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stephenlwlhotmailcom@gmail.com',
        pass: 'eiau bqdb wkgj qbfl'
      }
    });

    const getTowingStatusTemplate = () => {
      const statusConfig = {
        'pending': {
          subject: 'Towing Request Received',
          color: '#6c757d',
          title: 'Request Received',
          message: `We've received your towing request and are processing it.`
        },
        'accepted': {
          subject: 'Towing Request Accepted',
          color: '#28a745',
          title: 'Request Accepted',
          message: `Your towing request has been accepted. Our team is dispatching a driver to assist you.`
        },
        'dispatched': {
          subject: 'Towing Service Dispatched',
          color: '#17a2b8',
          title: 'Driver Dispatched',
          message: `A towing vehicle has been dispatched to your location.`
        },
        'on_the_way': {
          subject: 'Towing Service On The Way',
          color: '#007bff',
          title: 'On The Way',
          message: `Our towing service is on the way to your location.`
        },
        'arrived': {
          subject: 'Towing Service Has Arrived',
          color: '#28a745',
          title: 'Service Arrived',
          message: `Our towing service has arrived at your location.`
        },
        'in_progress': {
          subject: 'Towing Service In Progress',
          color: '#ffc107',
          title: 'Towing In Progress',
          message: `Your vehicle is being transported to the service center.`
        },
        'completed': {
          subject: 'Towing Service Completed',
          color: '#6f42c1',
          title: 'Service Completed',
          message: `Your vehicle has been safely delivered to the service center.`
        },
        'cancelled': {
          subject: 'Towing Request Cancelled',
          color: '#dc3545',
          title: 'Request Cancelled',
          message: `Your towing request has been cancelled.`
        },
        'declined': {
          subject: 'Towing Request Declined',
          color: '#dc3545',
          title: 'Request Declined',
          message: `Your towing request has been declined.`
        }
      };

      return statusConfig[status] || {
        subject: 'Towing Request Update',
        color: '#6c757d',
        title: 'Status Updated',
        message: `Your towing request status has been updated.`
      };
    };

    const statusInfo = getTowingStatusTemplate();

    await transporter.sendMail({
      from: `"${serviceCenterName}" <stephenlwlhotmailcom@gmail.com>`,
      to: toEmail,
      subject: statusInfo.subject,
      html: `
      <div style="font-family: Arial, sans-serif; font-size:14px; color:#333; line-height:1.6; max-width:600px; margin:0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #d9534f 0%, #f5576c 100%); padding:30px; text-align:center; color:white;">
          <img src="cid:logo" alt="AutoMate Logo" style="max-height:100px; margin-bottom:5px;">
          <h1 style="margin:10px 0; font-size:16px;">Towing Service - ${towingType} Update</h1>
          <div style="background:${statusInfo.color}; padding:8px 16px; border-radius:20px; display:inline-block; font-weight:bold;">
            ${statusInfo.title}
          </div>
        </div>

        <!-- Content -->
        <div style="padding:30px; background:#f8f9fa;">
          <p>Dear <strong>${customerName}</strong>,</p>
          
          <div style="background:white; padding:20px; border-radius:8px; border-left:4px solid ${statusInfo.color}; margin:20px 0;">
            <p style="margin:0; font-size:16px;">${statusInfo.message}</p>
          </div>

          <!-- Request Details -->
          <div style="background:white; padding:20px; border-radius:8px; margin:20px 0;">
            <h3 style="color:#333; margin-top:0;">Towing Details</h3>
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0; color:#666; width:40%;">Request ID:</td>
                <td style="padding:8px 0; font-weight:bold;">${requestId}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#666;">Vehicle:</td>
                <td style="padding:8px 0; font-weight:bold;">${vehicleInfo}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#666;">Pickup Location:</td>
                <td style="padding:8px 0; font-weight:bold;">${pickupLocation}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#666;">Destination:</td>
                <td style="padding:8px 0; font-weight:bold;">${destination}</td>
              </tr>
              ${estimatedArrival ? `
              <tr>
                <td style="padding:8px 0; color:#666;">Estimated Arrival:</td>
                <td style="padding:8px 0; font-weight:bold;">${estimatedArrival}</td>
              </tr>
              ` : ''}
              ${driverInfo ? `
              <tr>
                <td style="padding:8px 0; color:#666;">Driver:</td>
                <td style="padding:8px 0; font-weight:bold;">${driverInfo}</td>
              </tr>
              ` : ''}
              ${driverVehicleInfo ? `
              <tr>
                <td style="padding:8px 0; color:#666;">Driver Vehicle:</td>
                <td style="padding:8px 0; font-weight:bold;">${driverVehicleInfo}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${notes ? `
          <div style="background:#fff3cd; padding:15px; border-radius:8px; border-left:4px solid #ffc107; margin:20px 0;">
            <h4 style="margin:0 0 10px 0; color:#856404;">Additional Notes:</h4>
            <p style="margin:0; color:#856404;">${notes}</p>
          </div>
          ` : ''}

          <!-- Contact Information -->
          <div style="background:#d4edda; padding:15px; border-radius:8px; border-left:4px solid #28a745; margin:20px 0;">
            <h4 style="margin:0 0 10px 0; color:#155724;">Need Assistance?</h4>
            <p style="margin:0; color:#155724;">
              If you need immediate assistance, please contact our towing dispatch at ${serviceCenterName}.
            </p>
          </div>

          <p style="margin-top:30px;">
            Thank you for choosing AutoMate Towing Services.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#343a40; padding:20px; text-align:center; color:white;">
          <p style="margin:0; font-size:12px;">
            © ${new Date().getFullYear()} ${serviceCenterName}. All rights reserved.<br>
            This is an automated message, please do not reply directly to this email.
          </p>
        </div>
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

    res.json({ success: true, message: 'Towing request notification sent successfully' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ success: false, error: 'Failed to send towing notification' });
  }
});

export default router;