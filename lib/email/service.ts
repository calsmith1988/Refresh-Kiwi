import { buildAppUrl, getEmailFrom, getResendApiKey } from "@/lib/email/config";

async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
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
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      reply_to: params.replyTo,
    }),
  });

  if (!response.ok) {
    console.error(
      `[refresh-kiwi] Resend email failed (${response.status}) for "${params.subject}" to ${params.to}`,
    );
  }
}

function shell(
  content: string,
  footer?: string,
  options?: { showBrandHeader?: boolean },
): string {
  const logoUrl = buildAppUrl("/refresh-kiwi-favicon-v2.png");
  const showBrandHeader = options?.showBrandHeader ?? true;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px">
      ${
        showBrandHeader
          ? `<div style="display:flex;align-items:center;gap:10px;margin:0 0 20px">
        <img src="${logoUrl}" alt="" width="32" height="32" style="display:block;border-radius:999px" />
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em">Refresh Kiwi</div>
      </div>`
          : ""
      }
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

function outlineButton(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#fff;color:#111;padding:12px 18px;border-radius:999px;border:1px solid #111;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}

function heading(text: string): string {
  return `<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;letter-spacing:-0.02em;margin:0 0 16px">${escapeHtml(text)}</h1>`;
}

function card(innerHtml: string): string {
  return `<div style="background:#faf8f1;border:1px solid #ebe7da;border-radius:16px;padding:16px 20px;margin:18px 0">${innerHtml}</div>`;
}

function feature(title: string, body: string): string {
  return `<p style="margin:8px 0"><strong>${escapeHtml(title)}</strong> — ${escapeHtml(body)}</p>`;
}

function preserveLineBreaks(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function previewReadyCopy(
  brandName?: string | null,
  generationMode?: "refresh" | "fresh" | null,
  isPro?: boolean,
) {
  const name = brandName?.trim();
  // Fresh builds (from-scratch or Google listing) were never "refreshed".
  const adjective = generationMode === "fresh" ? "new" : "refreshed";
  // Pro subscribers already pay for publishing, so never pitch them Pro.
  const nextSteps = isPro
    ? "You can view it, save it, or ask for changes — publishing is included in your Kiwi Pro plan."
    : "You can view it, save it, ask for changes, or go Pro when you are ready.";

  if (!name) {
    return {
      subject: `Your ${adjective} homepage is ready`,
      headline: `Your ${adjective} homepage is ready.`,
      text: `Your ${adjective} homepage is ready. ${nextSteps}`,
    };
  }

  return {
    subject: `Your ${adjective} ${name} homepage is ready`,
    headline: `Your ${adjective} ${name} homepage is ready.`,
    text: `Your ${adjective} ${name} homepage is ready. ${nextSteps}`,
  };
}

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string | null;
  verificationToken: string;
}) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";
  const htmlGreeting = escapeHtml(greeting);
  const verifyUrl = buildAppUrl(
    `/verify-email?token=${encodeURIComponent(params.verificationToken)}`,
  );
  const dashboardUrl = buildAppUrl("/dashboard");
  const homeUrl = buildAppUrl("/");

  await sendEmail({
    to: params.to,
    subject: "Welcome to Refresh Kiwi",
    text: [
      greeting,
      "",
      "Thanks for joining Refresh Kiwi. If you've just built a preview, it's saved to your dashboard — that's where everything happens from here.",
      "",
      `First, verify your email so account and preview updates reach you (the link expires in 24 hours): ${verifyUrl}`,
      "",
      "What you can do next:",
      "- Make changes — ask in plain English and we'll update your site",
      "- Add pages — About, Services, Contact, whatever you need",
      "- Go live — Kiwi Pro puts your site online with hosting and your own web address",
      "",
      `Open your dashboard: ${dashboardUrl}`,
      "",
      `Haven't built a preview yet? Paste your current website — or just describe your business — and we'll have one ready in about two minutes: ${homeUrl}`,
    ].join("\n"),
    html: shell(`
      ${heading("Nice — you're in.")}
      <p>${htmlGreeting}</p>
      <p>Thanks for joining Refresh Kiwi. If you've just built a preview, it's saved to your dashboard — that's where everything happens from here.</p>
      <p>First, verify your email so account and preview updates reach you.</p>
      <p>${button(verifyUrl, "Verify email")}</p>
      <p style="color:#666;font-size:13px">The verification link expires in 24 hours.</p>
      ${card(`
        <p style="margin:0 0 8px;font-weight:700">What you can do next</p>
        ${feature("Make changes", "ask in plain English and we'll update your site")}
        ${feature("Add pages", "About, Services, Contact, whatever you need")}
        ${feature("Go live", "Kiwi Pro puts your site online with hosting and your own web address")}
      `)}
      <p>${outlineButton(dashboardUrl, "Open your dashboard")}</p>
      <p style="color:#666">Haven't built a preview yet? <a href="${escapeHtml(homeUrl)}" style="color:#111">Paste your current website — or just describe your business</a> — and we'll have one ready in about two minutes.</p>
    `),
  });
}

export async function sendContactEnquiryEmail(params: {
  to: string;
  siteName: string;
  visitorName: string;
  visitorEmail: string;
  message: string;
}) {
  const siteName = params.siteName.trim() || "your website";
  const subject = "New enquiry through your website contact form";

  await sendEmail({
    to: params.to,
    replyTo: params.visitorEmail,
    subject,
    text: [
      "You've received a new enquiry through your website contact form.",
      "",
      `Website: ${siteName}`,
      "",
      `Name: ${params.visitorName}`,
      `Email: ${params.visitorEmail}`,
      "",
      "Message:",
      params.message,
    ].join("\n"),
    html: shell(
      `
      ${heading("You've received a new enquiry through your website contact form.")}
      <p style="margin:0 0 18px;color:#555">Website: <strong>${escapeHtml(siteName)}</strong></p>
      <p><strong>Name:</strong> ${escapeHtml(params.visitorName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(params.visitorEmail)}</p>
      ${card(`
        <p style="margin:0 0 8px;font-weight:700">Message</p>
        <p style="margin:0">${preserveLineBreaks(params.message)}</p>
      `)}
      `,
      "This enquiry was sent through your website contact form. Powered by Refresh Kiwi.",
      { showBrandHeader: false },
    ),
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
      ${heading("Verify your email.")}
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
      ${heading("Confirm your new email.")}
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
      ${heading("Your email was changed.")}
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
      ${heading("Reset your password.")}
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
      ${heading("Your password was changed.")}
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
  generationMode?: "refresh" | "fresh" | null;
  isPro?: boolean;
}) {
  const url = buildAppUrl(params.previewUrl);
  const screenshotUrl = params.screenshotUrl
    ? buildAppUrl(params.screenshotUrl)
    : null;
  const copy = previewReadyCopy(
    params.brandName,
    params.generationMode,
    params.isPro,
  );
  const htmlNextSteps = params.isPro
    ? "You can save it, ask for changes — publishing is included in your Kiwi Pro plan."
    : "You can save it, ask for changes, or go Pro when you are ready.";

  await sendEmail({
    to: params.to,
    subject: copy.subject,
    text: `${copy.text}\n\n${url}`,
    html: shell(`
      ${heading(copy.headline)}
      ${
        screenshotUrl
          ? `<p><img src="${escapeHtml(screenshotUrl)}" alt="" style="display:block;width:100%;max-width:512px;border-radius:18px;border:1px solid #e5e5e5;margin:18px 0" /></p>`
          : ""
      }
      <p>${button(url, "View your preview")}</p>
      <p style="color:#666">${htmlNextSteps}</p>
    `),
  });
}

export async function sendUpgradeSuccessEmail(params: { to: string }) {
  const dashboardUrl = buildAppUrl("/dashboard");

  await sendEmail({
    to: params.to,
    subject: "You're on Kiwi Pro — your website is going live",
    text: [
      "Welcome to Kiwi Pro. Your website is now online, hosted by us.",
      "",
      "You'll find its live Refresh Kiwi address on your dashboard (yourbusiness.refreshkiwi.site). Share that, or connect your own domain when you're ready.",
      "",
      "Your plan includes:",
      "- Live hosting — we keep your site online, no tech setup",
      "- Unlimited changes — just ask in plain English",
      "- Your own web address — connect www.yourbusiness.com",
      "- Extra pages — add them whenever you need",
      "- Up to 3 websites saved to your account",
      "",
      "Worth doing now: connect your own domain — it takes a few minutes and we walk you through the DNS steps.",
      "",
      `Open your dashboard: ${dashboardUrl}`,
      "",
      "Stripe will send your receipt separately. Manage or cancel anytime from your account — no contracts, no hidden fees.",
    ].join("\n"),
    html: shell(`
      ${heading("Welcome to Kiwi Pro.")}
      <p>Your website is now online, hosted by us. You'll find its live Refresh Kiwi address on your dashboard (<code>yourbusiness.refreshkiwi.site</code>). Share that, or connect your own domain when you're ready.</p>
      <p>Here's what your plan includes:</p>
      ${card(`
        ${feature("Live hosting", "we keep your site online, no tech setup")}
        ${feature("Unlimited changes", "just ask in plain English")}
        ${feature("Your own web address", "connect www.yourbusiness.com")}
        ${feature("Extra pages", "add them whenever you need")}
        ${feature("Up to 3 websites", "saved to your account")}
      `)}
      <p><strong>Worth doing now:</strong> connect your own domain — it takes a few minutes and we walk you through the DNS steps.</p>
      <p>${button(dashboardUrl, "Open dashboard")}</p>
      <p style="color:#666;font-size:13px">Stripe will send your receipt separately. Manage or cancel anytime from your account — no contracts, no hidden fees.</p>
    `),
  });
}

export async function sendPaymentFailedEmail(params: { to: string }) {
  await sendEmail({
    to: params.to,
    subject: "Refresh Kiwi payment failed",
    text: `We couldn't collect your latest Kiwi Pro payment. Please update your billing details to avoid losing Pro access:\n\n${buildAppUrl("/dashboard")}`,
    html: shell(`
      ${heading("We couldn't collect your payment.")}
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
      ${heading("Kiwi Pro has been cancelled.")}
      <p>Your Kiwi Pro subscription has been cancelled.</p>
      <p>You can restart it anytime from your dashboard.</p>
      <p>${button(buildAppUrl("/dashboard"), "Open dashboard")}</p>
    `),
  });
}

export async function sendDomainConnectedEmail(params: {
  to: string;
  domain: string;
}) {
  const url = `https://${params.domain}`;

  await sendEmail({
    to: params.to,
    subject: "Your domain is connected",
    text: `Your Refresh Kiwi website is now connected to ${params.domain}.\n\nOpen your website: ${url}`,
    html: shell(`
      ${heading("Your domain is connected.")}
      <p>Your Refresh Kiwi website is now connected to <strong>${escapeHtml(params.domain)}</strong>.</p>
      <p>${button(url, "Open your website")}</p>
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
    subject: "Want to put your new website online?",
    text: `Your new website is waiting in Refresh Kiwi. If you're ready, Kiwi Pro puts it online with hosting, extra pages, custom domain support, and unlimited changes.\n\nOpen dashboard: ${dashboardUrl}\n\nUnsubscribe from follow-up emails: ${unsubscribeUrl}`,
    html: shell(
      `
      ${heading("Want to put your new website online?")}
      <p>Your new website is waiting in Refresh Kiwi.</p>
      <p>If you're ready, Kiwi Pro puts it online with hosting, extra pages, custom domain support, and unlimited changes.</p>
      <p>${button(dashboardUrl, "Open dashboard")}</p>
      <p style="font-size:12px;color:#666"><a href="${unsubscribeUrl}">Unsubscribe from follow-up emails</a></p>
    `,
      `You received this because you created a Refresh Kiwi account. <a href="${unsubscribeUrl}">Unsubscribe</a>.`,
    ),
  });
}

/**
 * "Your website pauses soon" nudge, sent once per website as the free 7-day
 * window closes. Transactional (a service-state change), so it is not gated
 * on marketing consent.
 */
export async function sendExpiryReminderEmail(params: {
  to: string;
  brandName?: string | null;
  expiresAt: Date;
}) {
  const dashboardUrl = buildAppUrl("/dashboard");
  const name = params.brandName?.trim();
  const siteLabel = name ? `your ${name} website` : "your website";
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(params.expiresAt);

  await sendEmail({
    to: params.to,
    subject: `Your free preview ends on ${dateLabel}`,
    text: `The free preview of ${siteLabel} ends on ${dateLabel}. After that it's paused — saved exactly as you left it, but offline.\n\nPut it online to keep it live, with hosting, extra pages, custom domain support, and unlimited changes.\n\nOpen dashboard: ${dashboardUrl}`,
    html: shell(`
      ${heading(`Your free preview ends on ${dateLabel}.`)}
      <p>The free preview of ${escapeHtml(siteLabel)} ends on ${escapeHtml(dateLabel)}. After that it's paused — saved exactly as you left it, but offline.</p>
      <p>Put it online to keep it live, with hosting, extra pages, custom domain support, and unlimited changes.</p>
      <p>${button(dashboardUrl, "Put my website online")}</p>
    `),
  });
}
