import { buildAppUrl, getEmailFrom, getResendApiKey } from "@/lib/email/config";

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    console.warn(
      `[refresh-kiwi] RESEND_API_KEY missing; skipped email "${params.subject}" to ${params.to}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      ...params,
    }),
  });

  if (!response.ok) {
    console.error(
      `[refresh-kiwi] Resend email failed (${response.status}) for "${params.subject}" to ${params.to}`,
    );
  }
}

function shell(content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:28px;margin:0 0 16px">Refresh Kiwi</h1>
      ${content}
      <p style="font-size:12px;color:#666;margin-top:32px">You received this because you have a Refresh Kiwi account.</p>
    </div>
  `;
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string | null;
}) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  await sendEmail({
    to: params.to,
    subject: "Welcome to Refresh Kiwi",
    text: `${greeting}\n\nWelcome to Refresh Kiwi. Paste your current website and we will help you turn it into a fresher preview.\n\n${buildAppUrl("/")}`,
    html: shell(`
      <p>${greeting}</p>
      <p>Welcome to Refresh Kiwi. Paste your current website and we will help you turn it into a fresher preview.</p>
      <p><a href="${buildAppUrl("/")}" style="display:inline-block;background:#c0ea70;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Start a refresh</a></p>
    `),
  });
}

export async function sendVerificationEmail(params: {
  to: string;
  token: string;
}) {
  const url = buildAppUrl(`/verify-email?token=${encodeURIComponent(params.token)}`);

  await sendEmail({
    to: params.to,
    subject: "Verify your Refresh Kiwi email",
    text: `Verify your email address by opening this link:\n\n${url}\n\nThis link expires in 24 hours.`,
    html: shell(`
      <p>Please verify your email address so we know where to send account and preview updates.</p>
      <p><a href="${url}" style="display:inline-block;background:#c0ea70;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Verify email</a></p>
      <p style="color:#666">This link expires in 24 hours.</p>
    `),
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
}) {
  const url = buildAppUrl(`/reset-password?token=${encodeURIComponent(params.token)}`);

  await sendEmail({
    to: params.to,
    subject: "Reset your Refresh Kiwi password",
    text: `Reset your password by opening this link:\n\n${url}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: shell(`
      <p>Use the button below to reset your password.</p>
      <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Reset password</a></p>
      <p style="color:#666">This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
    `),
  });
}

export async function sendPasswordChangedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Your Refresh Kiwi password was changed",
    text: "Your Refresh Kiwi password was changed. If this was not you, reset your password immediately.",
    html: shell(`
      <p>Your Refresh Kiwi password was changed.</p>
      <p>If this was not you, reset your password immediately.</p>
    `),
  });
}
