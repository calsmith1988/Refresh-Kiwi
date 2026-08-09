import type { Metadata } from "next";

import RefreshPage from "@/components/RefreshPage";

export const metadata: Metadata = {
  title: "2 Minutes. One New Website. | Refresh Kiwi",
  description:
    "Give us a couple of minutes and see a brand-new website for your business. No coding, no complicated builder. Free to try — no signup needed.",
  openGraph: {
    title: "2 Minutes. One New Website. | Refresh Kiwi",
    description:
      "Refresh your old website or start fresh. See your new site in about 2 minutes — free to try, and nothing changes until you say so.",
    url: "/",
  },
  twitter: {
    title: "2 Minutes. One New Website. | Refresh Kiwi",
    description:
      "See your new website in about 2 minutes. No coding, no complicated builder. Free to try.",
  },
};

export default function Home() {
  return (
    <RefreshPage
      googleBusinessImportEnabled={Boolean(process.env.GOOGLE_PLACES_API_KEY)}
      voiceInputEnabled={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
