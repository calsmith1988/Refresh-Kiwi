import type { Metadata } from "next";

import { noindexRobots } from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "Email preferences — Refresh Kiwi",
  robots: noindexRobots,
};

export default function UnsubscribeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
