export interface SendQRInvitationInput {
  to: string;
  participantName: string;
  eventName: string;
  qrToken: string;
}

export async function sendQRInvitation(input: SendQRInvitationInput): Promise<void> {
  throw new Error('sendQRInvitation not implemented: wire up Resend/Nodemailer');
}
