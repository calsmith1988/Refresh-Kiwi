import type { Metadata } from "next";

import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Reset your password — Refresh Kiwi",
  robots: noindexRobots,
};

export default function ResetPasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
