import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.QR_TOKEN_SECRET);

export interface QRTokenPayload {
  registrationId: string;
  eventId: string;
  participantId: string;
}

export async function signQRToken(payload: QRTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(secret());
}

export async function verifyQRToken(token: string): Promise<QRTokenPayload> {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as QRTokenPayload;
}
