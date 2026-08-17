import type { Metadata } from "next";

import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Email change — Refresh Kiwi",
  robots: noindexRobots,
};

export default function ChangeEmailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
