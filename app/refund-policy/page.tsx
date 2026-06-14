import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";

const page = legalPages.refunds;

export const metadata: Metadata = {
  title: `${page.title} — Refresh Kiwi`,
  description: page.description,
};

export default function RefundPolicyPage() {
  return <LegalPage page={page} />;
}
