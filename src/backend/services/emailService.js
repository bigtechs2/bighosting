// ==========================================
// © bighosting by bigmanjtech™
// Email Service – Reset Password Emails
// ==========================================

import dotenv from 'dotenv';

dotenv.config();

// We'll use Resend for email sending
// Sign up at resend.com for free API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@bighosting.com';

// If no Resend key, fallback to console logging (for testing)
const useResend = RESEND_API_KEY && RESEND_API_KEY !== 're_your-resend-api-key';

let resend = null;
if (useResend) {
  try {
    const { Resend } = await import('resend');
    resend = new Resend(RESEND_API_KEY);
  } catch (e) {
    console.warn('⚠️ Resend module not installed. Using console fallback.');
  }
}

// ==========================================
// Send Password Reset Email
// ==========================================

export async function sendPasswordResetEmail(email, name, resetLink) {
  const subject = '🔑 Reset Your bighosting Password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset Password</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0C10; color: #EAECEF; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #1A1C23; border-radius: 16px; padding: 40px; border: 1px solid #2E313C; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { font-size: 2.4rem; }
        .title { font-size: 1.6rem; font-weight: 700; color: #EAECEF; margin-top: 8px; }
        .brand { color: #10B981; }
        .content { color: #8B8F9E; line-height: 1.7; margin-bottom: 32px; }
        .content strong { color: #EAECEF; }
        .btn { display: inline-block; padding: 14px 40px; background: #10B981; color: #0B0C10; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 16px 0; }
        .btn:hover { background: #34D399; }
        .footer { text-align: center; color: #8B8F9E; font-size: 0.85rem; border-top: 1px solid #2E313C; padding-top: 24px; margin-top: 24px; }
        .footer a { color: #10B981; text-decoration: none; }
        .expiry { color: #8B8F9E; font-size: 0.85rem; text-align: center; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀</div>
          <div class="title"><span class="brand">bighosting</span> by bigmanjtech™</div>
        </div>
        <div class="content">
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          <p>We received a request to reset your password for your bighosting account.</p>
          <p>Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="btn">🔐 Reset Password</a>
          </div>
          <p style="font-size: 0.9rem; color: #8B8F9E;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 0.85rem; color: #10B981; word-break: break-all;">${resetLink}</p>
          <p style="font-size: 0.9rem; color: #8B8F9E; margin-top: 16px;">If you didn't request this, please ignore this email or contact support at <strong style="color: #EAECEF;">255636756591</strong>.</p>
        </div>
        <div class="expiry">⏳ This link expires in 1 hour</div>
        <div class="footer">
          © bighosting by bigmanjtech™<br />
          📞 <a href="https://wa.me/255636756591">255636756591</a> &bull;
          📧 <a href="mailto:bigmanj.tech@gmail.com">bigmanj.tech@gmail.com</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Reset Your bighosting Password

    Hello ${name || 'User'},

    We received a request to reset your password for your bighosting account.

    Click the link below to set a new password. This link will expire in 1 hour:

    ${resetLink}

    If you didn't request this, please ignore this email or contact support at 255636756591.

    © bighosting by bigmanjtech™
  `;

  // If Resend is available, send real email
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
        text: text,
      });
      console.log(`✅ Password reset email sent to ${email}`);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Resend error:', error.message);
      // Fall through to console fallback
    }
  }

  // Fallback: Log to console (for testing without Resend)
  console.log('========================================');
  console.log('📧 PASSWORD RESET EMAIL (CONSOLE FALLBACK)');
  console.log('========================================');
  console.log(`To: ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Link: ${resetLink}`);
  console.log('========================================');

  return { success: true, messageId: 'console-fallback' };
}

// ==========================================
// Send Welcome Email
// ==========================================

export async function sendWelcomeEmail(email, name) {
  const subject = '🚀 Welcome to bighosting!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to bighosting</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0C10; color: #EAECEF; padding: 40px 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #1A1C23; border-radius: 16px; padding: 40px; border: 1px solid #2E313C; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { font-size: 2.4rem; }
        .title { font-size: 1.6rem; font-weight: 700; color: #EAECEF; margin-top: 8px; }
        .brand { color: #10B981; }
        .content { color: #8B8F9E; line-height: 1.7; margin-bottom: 32px; }
        .btn { display: inline-block; padding: 14px 40px; background: #10B981; color: #0B0C10; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 16px 0; }
        .btn:hover { background: #34D399; }
        .footer { text-align: center; color: #8B8F9E; font-size: 0.85rem; border-top: 1px solid #2E313C; padding-top: 24px; margin-top: 24px; }
        .footer a { color: #10B981; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚀</div>
          <div class="title">Welcome to <span class="brand">bighosting</span>!</div>
        </div>
        <div class="content">
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          <p>Thank you for joining <strong>bighosting</strong> — the easiest way to host your WhatsApp and Telegram bots in Tanzania.</p>
          <p>You can now purchase hosting plans and deploy your bots instantly.</p>
          <div style="text-align: center;">
            <a href="https://bighosting.onrender.com/dashboard.html" class="btn">🚀 Go to Dashboard</a>
          </div>
          <p style="font-size: 0.9rem; color: #8B8F9E;">If you have any questions, we're here to help.</p>
        </div>
        <div class="footer">
          © bighosting by bigmanjtech™<br />
          📞 <a href="https://wa.me/255636756591">255636756591</a> &bull;
          📧 <a href="mailto:bigmanj.tech@gmail.com">bigmanj.tech@gmail.com</a>
        </div>
      </div>
    </body>
    </html>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });
      console.log(`✅ Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Resend error:', error.message);
    }
  }

  console.log(`📧 WELCOME EMAIL (CONSOLE): ${email}`);
  return { success: true };
}

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail,
};