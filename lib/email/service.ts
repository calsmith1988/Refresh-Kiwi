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
  const logoUrl = buildAppUrl("/refresh-kiwi-favicon-v2.png");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px">
      <div style="display:flex;align-items:center;gap:10px;margin:0 0 20px">
        <img src="${logoUrl}" alt="" width="32" height="32" style="display:block;border-radius:999px" />
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em">Refresh Kiwi</div>
      </div>
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
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#c5e66a;color:#111;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}

function previewReadyCopy(brandName?: string | null) {
  const name = brandName?.trim();

  if (!name) {
    return {
      subject: "Your refreshed homepage is ready",
      headline: "Your refreshed homepage is ready.",
      text:
        "Your refreshed homepage is ready. You can view it, save it, ask for changes, or go Pro when you are ready.",
    };
  }

  return {
    subject: `Your refreshed ${name} homepage is ready`,
    headline: `Your refreshed ${name} homepage is ready.`,
    text: `Your refreshed ${name} homepage is ready. You can view it, save it, ask for changes, or go Pro when you are ready.`,
  };
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
    text: `${greeting}\n\nWelcome to Refresh Kiwi. Paste your current website and we'll help you turn it into a fresher preview.\n\n${buildAppUrl("/")}`,
    html: shell(`
      <p>${htmlGreeting}</p>
      <p>Welcome to Refresh Kiwi. Paste your current website and we'll help you turn it into a fresher preview.</p>
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
    text: `Please verify your email address so we know where to send account and preview updates.\n\n${url}\n\nThis link expires in 24 hours.`,
    html: shell(`
      <p>Please verify your email address so we know where to send account and preview updates.</p>
      <p>${button(url, "Verify email")}</p>
      <p style="color:#666">This link expires in 24 hours.</p>
    `),
  });
}

export async function sendEmailChangeVerificationEmail(params: {
  to: string;
  token: string;
}) {
  const url = buildAppUrl(`/change-email?token=${encodeURIComponent(params.token)}`);

  await sendEmail({
    to: params.to,
    subject: "Confirm your new Refresh Kiwi email",
    text: `Use this link to confirm this as your new Refresh Kiwi email address:\n\n${url}\n\nThis link expires in 24 hours. If you did not request it, you can ignore this email.`,
    html: shell(`
      <p>Use the button below to confirm this as your new Refresh Kiwi email address.</p>
      <p>${button(url, "Confirm new email")}</p>
      <p style="color:#666">This link expires in 24 hours. If you did not request it, you can ignore this email.</p>
    `),
  });
}

export async function sendEmailChangedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Your Refresh Kiwi email was changed",
    text: `Your Refresh Kiwi account email was changed. If this was not you, reset your password now:\n\n${buildAppUrl("/forgot-password")}`,
    html: shell(`
      <p>Your Refresh Kiwi account email was changed.</p>
      <p>If this was not you, reset your password now.</p>
      <p>${button(buildAppUrl("/forgot-password"), "Reset password")}</p>
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
    text: `Use this link to reset your Refresh Kiwi password:\n\n${url}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: shell(`
      <p>Use the button below to reset your Refresh Kiwi password.</p>
      <p>${button(url, "Reset password")}</p>
      <p style="color:#666">This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
    `),
  });
}

export async function sendPasswordChangedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Your Refresh Kiwi password was changed",
    text: `Your Refresh Kiwi password was changed. If this was not you, reset your password now:\n\n${buildAppUrl("/forgot-password")}`,
    html: shell(`
      <p>Your Refresh Kiwi password was changed.</p>
      <p>If this was not you, reset your password now.</p>
      <p>${button(buildAppUrl("/forgot-password"), "Reset password")}</p>
    `),
  });
}

export async function sendPreviewReadyEmail(params: {
  to: string;
  brandName?: string | null;
  previewUrl: string;
  screenshotUrl?: string | null;
}) {
  const url = buildAppUrl(params.previewUrl);
  const screenshotUrl = params.screenshotUrl
    ? buildAppUrl(params.screenshotUrl)
    : null;
  const copy = previewReadyCopy(params.brandName);
  const htmlHeadline = escapeHtml(copy.headline);

  await sendEmail({
    to: params.to,
    subject: copy.subject,
    text: `${copy.text}\n\n${url}`,
    html: shell(`
      <p><strong>${htmlHeadline}</strong></p>
      ${
        screenshotUrl
          ? `<p><img src="${escapeHtml(screenshotUrl)}" alt="" style="display:block;width:100%;max-width:512px;border-radius:18px;border:1px solid #e5e5e5;margin:18px 0" /></p>`
          : ""
      }
      <p>${button(url, "View your preview")}</p>
      <p style="color:#666">You can save it, ask for changes, or go Pro when you are ready.</p>
    `),
  });
}

export async function sendUpgradeSuccessEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Welcome to Kiwi Pro",
    text: `You're on Kiwi Pro. Your refreshed websites can stay live, and you can manage everything from your dashboard:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      <p>You're on <strong>Kiwi Pro</strong>.</p>
      <p>Your refreshed websites can stay live, and you can manage everything from your dashboard.</p>
      <p>${button(buildAppUrl("/dashboard"), "Open dashboard")}</p>
    `),
  });
}

export async function sendPaymentFailedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Refresh Kiwi payment failed",
    text: `We couldn't collect your latest Kiwi Pro payment. Please update your billing details to avoid losing Pro access:\n\n${buildAppUrl("/dashboard")}`,
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
    text: `Your Kiwi Pro subscription has been cancelled. You can restart it anytime from your dashboard:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      <p>Your Kiwi Pro subscription has been cancelled.</p>
      <p>You can restart it anytime from your dashboard.</p>
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
    text: `Your refreshed website is waiting in Refresh Kiwi. If you're ready, Kiwi Pro puts it online with hosting, extra pages, custom domain support, and unlimited changes.\n\nOpen dashboard: ${dashboardUrl}\n\nUnsubscribe from follow-up emails: ${unsubscribeUrl}`,
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
