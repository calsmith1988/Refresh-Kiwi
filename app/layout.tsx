import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Refresh Kiwi — Same website, fresher skin",
  description:
    "Paste your web address and get a fresh, modern version of your website in about 2 minutes. Built for local businesses. Same website, fresher skin.",
  icons: {
    icon: "/refresh-kiwi-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
