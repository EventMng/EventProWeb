import nodemailer from 'nodemailer';
import { generateQRCodeDataURL } from './qr-token';

export interface SendQRInvitationInput {
  to: string;
  participantName: string;
  eventName: string;
  eventDate?: string;
  location?: string;
  qrToken: string;
}

export async function sendQRInvitation(input: SendQRInvitationInput): Promise<boolean> {
  const {to, participantName, eventName, eventDate, location, qrToken} = input;

  // Create the QR image data URL (Base64)
  const qrImageDataUrl = await generateQRCodeDataURL(qrToken, 200);
  
  // Nodemailer Transporter setup (for local testing or SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  // Email Content with inline QR code
  const htmlContent = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <!-- Header Bar -->
      <div style="background-color: #032042; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800;">EventPro</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Your Official Entry Ticket</p>
      </div>
      <!-- Ticket Body -->
      <div style="padding: 24px; text-align: center;">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 20px;">Hello, ${participantName}!</h3>
        <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">You are confirmed for <strong>${eventName}</strong>.</p>
        <!-- QR Code Container -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; display: inline-block; border: 1px dashed #d1d5db; margin-bottom: 20px;">
          <img src="${qrImageDataUrl}" alt="Event QR Ticket" style="width: 220px; height: 220px; display: block; margin: 0 auto;" />
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">Scan at gate for instant check-in</p>
        </div>
        <!-- Event Details -->
        <div style="text-align: left; background-color: #eff6ff; padding: 16px; border-radius: 8px; font-size: 13px; color: #1e40af;">
          ${eventDate ? `<p style="margin: 4px 0;">📅 <strong>Date:</strong> ${eventDate}</p>` : ''}
          ${location ? `<p style="margin: 4px 0;">📍 <strong>Venue:</strong> ${location}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  if (!process.env.SMTP_USER){
    console.warn(`SMTP is not configured. Email not sent to ${to} for event ${eventName}`);
    console.log(`Embaded QR Image Length ${qrImageDataUrl.length} bytes\n`);
    return true;
  }

  // Send the email
  await transporter.sendMail({
    from: '"EventPro" <[EMAIL_ADDRESS]>',
    to,
    subject: `You're Invited! Your QR Ticket for ${eventName}`,
    html: htmlContent,
    text: `Hello ${participantName},\n\nYou are invited to ${eventName}.\nPlease find your QR Ticket embedded in the email.\n\nBest regards,\nEventPro Team`
  });

  return true;

}

