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

const getMailFrom = (): string => {
  const from = process.env.MAIL_FROM;
  if (from) return from;
  console.warn('MAIL_FROM is not set; falling back to a placeholder sender address.');
  return '"EventPro" <no-reply@eventpro.local>';
};

export interface SendMemberInvitationInput {
  to: string;
  fullName: string;
  organizationName: string;
  role: string;
  tempPassword: string;
}

// Emails a newly-added member (Organizer, Frontman, etc.) their login email
// and temporary password, so an admin never has to relay credentials
// manually or leave them visible in their own browser after creation.
export async function sendMemberInvitation(input: SendMemberInvitationInput): Promise<boolean> {
  const { to, fullName, organizationName, role, tempPassword } = input;

  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'live.smtp.mailtrap.io',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER || 'api',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

  const htmlContent = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #032042; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800;">EventPro</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">You've been added to a team</p>
      </div>
      <div style="padding: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 20px;">Hello, ${fullName}!</h3>
        <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">
          You've been added as a <strong>${roleLabel}</strong> for <strong>${organizationName}</strong> on EventPro.
          Use the credentials below to sign in — you'll be asked to set a new password on first login.
        </p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px dashed #d1d5db;">
          <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Temporary password:</strong> <span style="font-family: monospace; font-size: 14px;">${tempPassword}</span></p>
        </div>
      </div>
    </div>
  `;

  if (!process.env.SMTP_USER) {
    console.warn(`SMTP is not configured. Invitation email not sent to ${to}.`);
    return true;
  }

  const headers: Record<string, string> = {};
  if (process.env.POSTMARK_STREAM) {
    headers['X-PM-Message-Stream'] = process.env.POSTMARK_STREAM;
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject: `You've been added to ${organizationName} on EventPro`,
      html: htmlContent,
      text: `Hello ${fullName},\n\nYou've been added as a ${roleLabel} for ${organizationName} on EventPro.\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nBest regards,\nEventPro Team`,
      headers,
    });
    console.log(`[SMTP] Invitation email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[SMTP] Failed to send invitation email to ${to}:`, error);
    return false;
  }
}

export async function sendQRInvitation(input: SendQRInvitationInput): Promise<boolean> {
  const {to, participantName, eventName, eventDate, location, qrToken} = input;

  // Create the QR image data URL (Base64)
  const qrImageDataUrl = await generateQRCodeDataURL(qrToken, 200);

  // Nodemailer Transporter setup (configured for Mailtrap / SMTP)
  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'live.smtp.mailtrap.io',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER || 'api',
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
    console.log(`Embedded QR Image Length ${qrImageDataUrl.length} bytes\n`);
    return true;
  }

  // Optional Postmark Message Stream (defaults to outbound stream if omitted)
  const headers: Record<string, string> = {};
  if (process.env.POSTMARK_STREAM) {
    headers['X-PM-Message-Stream'] = process.env.POSTMARK_STREAM;
  }

  // Send the email via SMTP
  try {
    const info = await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject: `You're Invited! Your QR Ticket for ${eventName}`,
      html: htmlContent,
      text: `Hello ${participantName},\n\nYou are invited to ${eventName}.\nPlease find your QR Ticket embedded in the email.\n\nBest regards,\nEventPro Team`,
      headers,
    });
    console.log(`[SMTP] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[SMTP] Failed to send email to ${to}:`, error);
    return false;
  }
}

export interface SendFrontmanAssignmentInput {
  to: string;
  fullName: string;
  eventName: string;
  eventDate?: string;
  location?: string;
  organizationName: string;
  tempPassword: string;
}

export async function sendFrontmanAssignmentEmail(input: SendFrontmanAssignmentInput): Promise<boolean> {
  const { to, fullName, eventName, eventDate, location, organizationName, tempPassword } = input;

  const port = Number(process.env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'live.smtp.mailtrap.io',
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER || 'api',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const htmlContent = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <!-- Header Bar -->
      <div style="background-color: #032042; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">EventPro</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Frontman Scanner Assignment</p>
      </div>

      <!-- Body Content -->
      <div style="padding: 28px 24px;">
        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 20px;">Hello, ${fullName}!</h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          You have been assigned as a <strong>Frontman (Ticket Scanner)</strong> for <strong>${eventName}</strong> by <strong>${organizationName}</strong>.
        </p>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          You can log into the <strong>EventPro Mobile App</strong> using the credentials below to scan attendee QR codes and manage gate check-ins:
        </p>

        <!-- Credentials Box -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 10px; border: 1px dashed #7c3aed; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">App Login Username</span>
            <span style="font-size: 15px; font-weight: 700; color: #111827;">${to}</span>
          </div>
          <div>
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Temporary Password</span>
            <span style="font-family: monospace; font-size: 18px; font-weight: 800; color: #7c3aed; letter-spacing: 0.05em;">${tempPassword}</span>
          </div>
        </div>

        <!-- Event Details Box -->
        <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; font-size: 13px; color: #1e40af; margin-bottom: 20px;">
          <p style="margin: 0 0 6px 0; font-weight: 700; font-size: 14px; color: #1e3a8a;">Event Details</p>
          <p style="margin: 4px 0;">🎯 <strong>Event:</strong> ${eventName}</p>
          ${eventDate ? `<p style="margin: 4px 0;">📅 <strong>Date:</strong> ${eventDate}</p>` : ''}
          ${location ? `<p style="margin: 4px 0;">📍 <strong>Venue:</strong> ${location}</p>` : ''}
        </div>

        <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5; text-align: center;">
          Please sign into the EventPro Mobile App prior to the event. For security, you may update your password in your profile settings after logging in.
        </p>
      </div>
    </div>
  `;

  if (!process.env.SMTP_USER) {
    console.warn(`SMTP is not configured. Frontman credentials email not sent to ${to}.`);
    return true;
  }

  const headers: Record<string, string> = {};
  if (process.env.POSTMARK_STREAM) {
    headers['X-PM-Message-Stream'] = process.env.POSTMARK_STREAM;
  }

  try {
    const info = await transporter.sendMail({
      from: getMailFrom(),
      to,
      subject: `Your Frontman Login Credentials for ${eventName}`,
      html: htmlContent,
      text: `Hello ${fullName},\n\nYou have been assigned as a Frontman (Ticket Scanner) for "${eventName}" by ${organizationName}.\n\nUse the credentials below to log into the EventPro Mobile App:\n\nEmail: ${to}\nTemporary Password: ${tempPassword}\n\nEvent: ${eventName}${eventDate ? `\nDate: ${eventDate}` : ''}${location ? `\nVenue: ${location}` : ''}\n\nBest regards,\nEventPro Team`,
      headers,
    });
    console.log(`[SMTP] Frontman assignment email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[SMTP] Failed to send frontman assignment email to ${to}:`, error);
    return false;
  }
}

