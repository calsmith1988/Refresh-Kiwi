export type LegalAnswers = {
  businessLegalName: string;
  tradingName?: string;
  country?: string;
  privacyEmail: string;
  hasContactForms?: boolean;
  hasBookings?: boolean;
  hasNewsletter?: boolean;
  hasPayments?: boolean;
  usesAnalytics?: boolean;
  usesAds?: boolean;
  usesLiveChat?: boolean;
  embedsMapsOrVideos?: boolean;
  hasExistingLegalPages?: boolean;
  notes?: string;
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TEXT_MODEL = "o4-mini";

function yesNo(value: boolean | undefined): string {
  return value ? "yes" : "no";
}

function extractOutputText(payload: OpenAiResponse): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

export function validateLegalAnswers(input: unknown): LegalAnswers {
  const value = input as Partial<LegalAnswers> | null;
  const businessLegalName = value?.businessLegalName?.trim() ?? "";
  const privacyEmail = value?.privacyEmail?.trim() ?? "";

  if (businessLegalName.length < 2) {
    throw new Error("Enter the business legal name.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyEmail)) {
    throw new Error("Enter a valid privacy contact email.");
  }

  return {
    businessLegalName,
    tradingName: value?.tradingName?.trim() || undefined,
    country: value?.country?.trim() || "United Kingdom",
    privacyEmail,
    hasContactForms: Boolean(value?.hasContactForms),
    hasBookings: Boolean(value?.hasBookings),
    hasNewsletter: Boolean(value?.hasNewsletter),
    hasPayments: Boolean(value?.hasPayments),
    usesAnalytics: Boolean(value?.usesAnalytics),
    usesAds: Boolean(value?.usesAds),
    usesLiveChat: Boolean(value?.usesLiveChat),
    embedsMapsOrVideos: Boolean(value?.embedsMapsOrVideos),
    hasExistingLegalPages: Boolean(value?.hasExistingLegalPages),
    notes: value?.notes?.trim() || undefined,
  };
}

export async function draftLegalPages(
  answers: LegalAnswers,
  existingLegalContent?: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Legal page drafting is not set up yet - OPENAI_API_KEY is missing.",
    );
  }

  const model = process.env.OPENAI_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
  const prompt = `Draft starter legal page copy for a small business website.

Important:
- This is a starter template, not legal advice.
- Do not claim the pages make the business legally compliant.
- Keep the copy clear, practical, and suitable for a UK small business unless the country says otherwise.
- Produce markdown with sections for Privacy Policy, Cookie Policy, and Terms.
- Include placeholders only where genuinely unavoidable.
- If existing legal page content is provided, preserve its substance and rewrite/structure it clearly instead of replacing it with generic policy text.

Business details:
- Legal name: ${answers.businessLegalName}
- Trading name: ${answers.tradingName ?? answers.businessLegalName}
- Country/region: ${answers.country ?? "United Kingdom"}
- Privacy contact email: ${answers.privacyEmail}
- Contact forms: ${yesNo(answers.hasContactForms)}
- Bookings: ${yesNo(answers.hasBookings)}
- Newsletter: ${yesNo(answers.hasNewsletter)}
- Payments: ${yesNo(answers.hasPayments)}
- Analytics: ${yesNo(answers.usesAnalytics)}
- Ads/tracking pixels: ${yesNo(answers.usesAds)}
- Live chat: ${yesNo(answers.usesLiveChat)}
- Embedded maps/videos: ${yesNo(answers.embedsMapsOrVideos)}
- Existing legal pages noted by user: ${yesNo(answers.hasExistingLegalPages)}
- Extra notes: ${answers.notes ?? "none"}

Existing legal page content found on the current site:
${existingLegalContent?.trim() || "None found during the quick source check."}`;

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | OpenAiResponse
    | { error?: { message?: string } };

  if (!response.ok) {
    const apiMessage =
      "error" in payload ? payload.error?.message : "OpenAI request failed";
    throw new Error(
      `Failed to draft legal starter copy: ${
        apiMessage ?? "OpenAI request failed"
      }`,
    );
  }

  const text = extractOutputText(payload as OpenAiResponse);

  if (!text) {
    throw new Error("OpenAI did not return legal starter copy.");
  }

  return text;
}
