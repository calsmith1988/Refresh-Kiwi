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

function shell(content: string, footer?: string): string {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:28px;margin:0 0 16px">Refresh Kiwi</h1>
      ${content}
      <p style="font-size:12px;color:#666;margin-top:32px">${footer ?? "You received this because you have a Refresh Kiwi account."}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function button(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#c0ea70;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string | null;
}) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);

  await sendEmail({
    to: params.to,
    subject: "Welcome to Refresh Kiwi",
    text: `${greeting}\n\nWelcome to Refresh Kiwi. Paste your current website and we will help you turn it into a fresher preview.\n\n${buildAppUrl("/")}`,
    html: shell(`
      <p>${htmlGreeting}</p>
      <p>Welcome to Refresh Kiwi. Paste your current website and we will help you turn it into a fresher preview.</p>
      <p>${button(buildAppUrl("/"), "Start a refresh")}</p>
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
      <p>${button(url, "Verify email")}</p>
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

export async function sendPreviewReadyEmail(params: {
  to: string;
  brandName?: string | null;
  previewUrl: string;
}) {
  const url = buildAppUrl(params.previewUrl);
  const name = params.brandName ?? "your website";
  const htmlName = escapeHtml(name);

  await sendEmail({
    to: params.to,
    subject: `Your refreshed ${name} homepage is ready`,
    text: `Your refreshed homepage is ready:\n\n${url}\n\nYou can save it, ask for changes, or go Pro when you are ready.`,
    html: shell(`
      <p>Your refreshed <strong>${htmlName}</strong> homepage is ready.</p>
      <p>${button(url, "View your preview")}</p>
      <p style="color:#666">You can save it, ask for changes, or go Pro when you are ready.</p>
    `),
  });
}

export async function sendUpgradeSuccessEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Welcome to Kiwi Pro",
    text: `You're on Kiwi Pro. Manage your websites here:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      <p>You're on <strong>Kiwi Pro</strong>.</p>
      <p>Your refreshed websites can stay live, and you can manage billing from your dashboard.</p>
      <p>${button(buildAppUrl("/dashboard"), "Open dashboard")}</p>
    `),
  });
}

export async function sendPaymentFailedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Refresh Kiwi payment failed",
    text: `We couldn't collect your latest Kiwi Pro payment. Please update your billing details:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      <p>We couldn't collect your latest Kiwi Pro payment.</p>
      <p>Please update your billing details to avoid losing Pro access.</p>
      <p>${button(buildAppUrl("/dashboard"), "Manage billing")}</p>
    `),
  });
}

export async function sendSubscriptionCanceledEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Kiwi Pro has been cancelled",
    text: `Your Kiwi Pro subscription has been cancelled. You can restart anytime from your dashboard:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      <p>Your Kiwi Pro subscription has been cancelled.</p>
      <p>You can restart anytime from your dashboard.</p>
      <p>${button(buildAppUrl("/dashboard"), "Open dashboard")}</p>
    `),
  });
}

export async function sendFreeFollowUpEmail(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const dashboardUrl = buildAppUrl("/dashboard");
  const unsubscribeUrl = buildAppUrl(
    `/unsubscribe?token=${encodeURIComponent(params.unsubscribeToken)}`,
  );

  await sendEmail({
    to: params.to,
    subject: "Want to put your refreshed website online?",
    text: `Your refreshed website is waiting in Refresh Kiwi.\n\nOpen dashboard: ${dashboardUrl}\n\nUnsubscribe from follow-up emails: ${unsubscribeUrl}`,
    html: shell(
      `
      <p>Your refreshed website is waiting in Refresh Kiwi.</p>
      <p>If you're ready, Kiwi Pro puts it online with hosting, extra pages, custom domain support, and unlimited changes.</p>
      <p>${button(dashboardUrl, "Open dashboard")}</p>
      <p style="font-size:12px;color:#666"><a href="${unsubscribeUrl}">Unsubscribe from follow-up emails</a></p>
    `,
      `You received this because you created a Refresh Kiwi account. <a href="${unsubscribeUrl}">Unsubscribe</a>.`,
    ),
  });
}
