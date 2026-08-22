import { SignJWT, jwtVerify } from "jose";
import { QRTokenPayload } from '@your-org/event-system-shared';
import qrcode from 'qrcode';


const getSecretKey = (): Uint8Array => {
  const secret = process.env.QR_TOKEN_SECRET ||
    "eventpro_default_qr_secret_key_2026";
  return new TextEncoder().encode(secret);

};

export async function signQRToken(
  payload: Omit<QRTokenPayload, 'iat' | 'exp'>,
  expiresIn: string = '90d'
): Promise<string> {
  const secretKey = getSecretKey();

  return new SignJWT({
    registrationId: payload.registrationId,
    eventId: payload.eventId,
    participantId: payload.participantId
  })
    .setProtectedHeader({
      alg: "HS256"
    })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)
}

export interface VerificationResult {
  valid: boolean;
  payload?: QRTokenPayload;
  error?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'MALFORMED_TOKEN';
}


// verify token
export async function verifyToken(token: string):
  Promise<VerificationResult> {
  try {
    if (!token) return {
      valid: false,
      error: 'MALFORMED_TOKEN'
    };

    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    return {
      valid: true,
      payload: payload as unknown as QRTokenPayload
    };
  } catch (error: any) {
    if (error?.name === 'JWTExpired') {
      return {
        valid: false,
        error: 'EXPIRED_TOKEN'
      };
    }

    return {
      valid: false,
      error: 'INVALID_TOKEN'
    };
  }

}

// generate  QR code
export async function generateQRCodeDataURL(
  data: string | object,
  size: number = 256
): Promise<string> {
  return qrcode.toDataURL(typeof data === 'object' ? JSON.stringify(data) : data, {
    width: size,
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}


// convert into svg string
export async function genrateQRCodeSVG(token: string):
Promise<string> {
  return qrcode.toString(token, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}