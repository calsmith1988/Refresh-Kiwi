import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { legalPages } from "@/lib/legal/pages";
import { legalPageMetadata } from "@/lib/seo/marketing";

const page = legalPages.cookies;

export const metadata: Metadata = legalPageMetadata(page);

export default function CookiePolicyPage() {
  return <LegalPage page={page} />;
}
