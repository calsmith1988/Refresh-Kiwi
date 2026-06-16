import type { Metadata } from "next";

import CookieConsentBanner from "@/components/CookieConsentBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-0J6KNZCKDF";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://refresh.kiwi",
  ),
  title: "Refresh Kiwi — Same website, fresher skin",
  description:
    "Paste your web address and get a fresh, modern version of your website in about 2 minutes. Built for local businesses. Same website, fresher skin.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Refresh Kiwi — Same website, fresher skin",
    description:
      "Paste your web address and get a fresh, modern version of your website in about 2 minutes. Built for local businesses.",
    url: "/",
    siteName: "Refresh Kiwi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Refresh Kiwi — Same website, fresher skin",
    description:
      "Paste your web address and get a fresh, modern version of your website in about 2 minutes.",
  },
  icons: {
    icon: "/refresh-kiwi-favicon-v2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GoogleAnalytics measurementId={gaMeasurementId} />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
