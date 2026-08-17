import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MarketingLandingPage from "@/components/MarketingLandingPage";
import {
  buildLandingPageMetadata,
  getLandingPageBySlug,
} from "@/lib/marketing/landing-pages";

const SLUG = "website-redesign-services";

export function generateMetadata(): Metadata {
  const page = getLandingPageBySlug(SLUG);
  if (!page) {
    return {};
  }
  return buildLandingPageMetadata(page);
}

export default function WebsiteRedesignServicesPage() {
  const page = getLandingPageBySlug(SLUG);
  if (!page) {
    notFound();
  }
  return <MarketingLandingPage page={page} />;
}
