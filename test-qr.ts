import { signQRToken, verifyToken, generateQRCodeDataURL } from './src/lib/qr-token';

async function runTest() {
  console.log('🚀 Step 1: Testing QR Token Functions...\n');

  // 1. Sample Test Payload එකක්
  const testPayload = {
    registrationId: 'reg_test_001',
    eventId: 'event_tech_summit_2026',
    participantId: 'part_nadeesha_01',
  };

  try {
    // A. Sign QR Token test
    console.log('1️⃣ Generating Signed QR JWT Token...');
    const token = await signQRToken(testPayload);
    console.log('🔑 Generated Token:', token, '\n');

    // B. Verify Token test
    console.log('2️⃣ Verifying Scanned Token...');
    const verification = await verifyToken(token);
    console.log('✅ Verification Result:', verification, '\n');

    // C. Generate QR Image Data URL test
    console.log('3️⃣ Generating QR Code Image Data URL...');
    const qrDataUrl = await generateQRCodeDataURL(token);
    console.log('🖼️ QR Data URL (Base64 Preview):', qrDataUrl.substring(0, 60) + '...\n');

    console.log('🎉 ALL TESTS PASSED PERFECTLY!');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

runTest();
