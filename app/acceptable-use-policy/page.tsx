import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";

const page = legalPages.acceptableUse;

export const metadata: Metadata = {
  title: `${page.title} — Refresh Kiwi`,
  description: page.description,
};

export default function AcceptableUsePolicyPage() {
  return <LegalPage page={page} />;
}
