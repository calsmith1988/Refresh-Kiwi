import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";

const page = legalPages.privacy;

export const metadata: Metadata = {
  title: `${page.title} — Refresh Kiwi`,
  description: page.description,
};

export default function PrivacyPolicyPage() {
  return <LegalPage page={page} />;
}
