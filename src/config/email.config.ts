/**
 * Email Configuration
 * Centralized configuration for all email-related values and templates
 */

export const EMAIL_CONFIG = {
  fromEmail: "Buildify <noreply@buildify.app>",
  companyName: "Buildify",
  verificationTokenExpiry: 24 * 60 * 60, // 24 hours in seconds
  resetTokenExpiry: 60 * 60, // 1 hour in seconds
  otpExpiry: 5 * 60, // 5 minutes in seconds
} as const;

/**
 * Base HTML email layout wrapper with inline CSS for email client compatibility
 */
function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <div style="display:inline-block;background-color:#18181b;border-radius:8px;padding:8px;margin-bottom:16px;">
                <span style="color:#fafafa;font-size:16px;font-weight:bold;">B</span>
              </div>
              <h2 style="margin:0 0 8px;color:#18181b;font-size:18px;font-weight:600;">${EMAIL_CONFIG.companyName}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">&copy; ${new Date().getFullYear()} ${EMAIL_CONFIG.companyName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email verification template
 */
export function getVerificationEmailTemplate({
  userName,
  verificationUrl,
}: {
  userName: string;
  verificationUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">Thanks for signing up for ${EMAIL_CONFIG.companyName}! Please verify your email address by clicking the button below.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${verificationUrl}" style="display:inline-block;background-color:#18181b;color:#fafafa;font-size:14px;font-weight:500;text-decoration:none;padding:10px 24px;border-radius:6px;">Verify Email Address</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin:0 0 16px;color:#3b82f6;font-size:13px;line-height:1.5;word-break:break-all;">${verificationUrl}</p>
    <p style="margin:0;color:#a1a1aa;font-size:12px;">If you didn't create an account, you can safely ignore this email.</p>`;

  return {
    subject: `Verify your email - ${EMAIL_CONFIG.companyName}`,
    html: emailLayout(content),
  };
}

/**
 * Password reset template
 */
export function getPasswordResetEmailTemplate({
  userName,
  resetUrl,
}: {
  userName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6;">Hi ${userName},</p>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new password.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <a href="${resetUrl}" style="display:inline-block;background-color:#18181b;color:#fafafa;font-size:14px;font-weight:500;text-decoration:none;padding:10px 24px;border-radius:6px;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin:0 0 16px;color:#3b82f6;font-size:13px;line-height:1.5;word-break:break-all;">${resetUrl}</p>
    <p style="margin:0;color:#a1a1aa;font-size:12px;">If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.</p>`;

  return {
    subject: `Reset your password - ${EMAIL_CONFIG.companyName}`,
    html: emailLayout(content),
  };
}

/**
 * OTP verification template
 */
export function getOTPEmailTemplate({
  email,
  otp,
}: {
  email: string;
  otp: string;
}): { subject: string; html: string } {
  const content = `
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.6;">Hi,</p>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">Use the following one-time password to sign in to your ${EMAIL_CONFIG.companyName} account (${email}).</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:0 0 24px;">
          <div style="display:inline-block;background-color:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:16px 32px;letter-spacing:8px;font-size:32px;font-weight:700;color:#18181b;font-family:monospace;">${otp}</div>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5;">This code expires in 5 minutes.</p>
    <p style="margin:0;color:#a1a1aa;font-size:12px;">If you didn't request this code, you can safely ignore this email.</p>`;

  return {
    subject: `Your verification code - ${EMAIL_CONFIG.companyName}`,
    html: emailLayout(content),
  };
}
