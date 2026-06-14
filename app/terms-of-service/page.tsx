import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";

const page = legalPages.terms;

export const metadata: Metadata = {
  title: `${page.title} — Refresh Kiwi`,
  description: page.description,
};

export default function TermsOfServicePage() {
  return <LegalPage page={page} />;
}
