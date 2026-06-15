import { getAppUrl } from "@/lib/stripe/config";

export function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || null;
}

export function getEmailFrom(): string {
  return (
    process.env.EMAIL_FROM?.trim() || "Refresh Kiwi <hello@refreshkiwi.com>"
  );
}

export function buildAppUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getAppUrl()}${normalizedPath}`;
}
