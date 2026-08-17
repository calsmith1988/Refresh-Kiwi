import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";
import { legalPageMetadata } from "@/lib/seo/marketing";

const page = legalPages.refunds;

export const metadata: Metadata = legalPageMetadata(page);

export default function RefundPolicyPage() {
  return <LegalPage page={page} />;
}
