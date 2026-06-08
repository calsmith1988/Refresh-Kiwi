import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Refresh Kiwi",
  description:
    "Modernise your small business website with AI. Paste your URL and get a fresh, award-worthy redesign.",
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
