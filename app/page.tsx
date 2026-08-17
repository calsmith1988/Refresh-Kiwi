import type { Metadata } from "next";

import RefreshPage from "@/components/RefreshPage";
import { getAbsoluteUrl } from "@/lib/blog/articles";
import {
  buildHomepageJsonLd,
  homepageOgImagePath,
  marketingCanonical,
} from "@/lib/seo/marketing";

export const metadata: Metadata = {
  title: "2 Minutes. One New Website. | Refresh Kiwi",
  description:
    "Give us a couple of minutes and see a brand-new website for your business. No coding, no complicated builder. Free to try — no signup needed.",
  alternates: marketingCanonical("/"),
  openGraph: {
    title: "2 Minutes. One New Website. | Refresh Kiwi",
    description:
      "Refresh your old website or start fresh. See your new site in about 2 minutes — free to try, and nothing changes until you say so.",
    url: getAbsoluteUrl("/"),
    siteName: "Refresh Kiwi",
    type: "website",
    images: [
      {
        url: homepageOgImagePath,
        width: 1200,
        height: 630,
        alt: "Refresh Kiwi — Same website, fresher skin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2 Minutes. One New Website. | Refresh Kiwi",
    description:
      "See your new website in about 2 minutes. No coding, no complicated builder. Free to try.",
    images: [homepageOgImagePath],
  },
};

export default function Home() {
  const jsonLdBlocks = buildHomepageJsonLd();

  return (
    <>
      {jsonLdBlocks.map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <RefreshPage
        googleBusinessImportEnabled={Boolean(process.env.GOOGLE_PLACES_API_KEY)}
        voiceInputEnabled={Boolean(process.env.OPENAI_API_KEY)}
      />
    </>
  );
}
