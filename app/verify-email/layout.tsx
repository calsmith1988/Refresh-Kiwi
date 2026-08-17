import type { Metadata } from "next";

import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Verify your email — Refresh Kiwi",
  robots: noindexRobots,
};

export default function VerifyEmailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
