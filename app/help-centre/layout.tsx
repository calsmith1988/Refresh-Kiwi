import type { Metadata } from "next";

import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Help centre — Refresh Kiwi",
  robots: noindexRobots,
};

export default function HelpCentreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
