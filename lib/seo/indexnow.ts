import { getAbsoluteUrl } from "@/lib/blog/articles";
import { getMarketingPublicUrls } from "@/lib/seo/marketing-urls";

/** Public IndexNow verification key (32 hex chars). Served at /{key}.txt. */
export const INDEXNOW_KEY = "e3f5de666e3b58ee2dcff3f763dbddd8";

export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;

const INDEXNOW_HOST = "refresh.kiwi";

const INDEXNOW_API_URL = "https://api.indexnow.org/indexnow";

export function getIndexNowKeyLocation(): string {
  return getAbsoluteUrl(INDEXNOW_KEY_PATH);
}

export type IndexNowSubmitResult = {
  ok: boolean;
  status: number;
  urlCount: number;
  body?: string;
};

export async function submitMarketingUrlsToIndexNow(
  urlList: string[] = getMarketingPublicUrls(),
): Promise<IndexNowSubmitResult> {
  const response = await fetch(INDEXNOW_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: getIndexNowKeyLocation(),
      urlList,
    }),
  });

  const body = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    urlCount: urlList.length,
    body: body || undefined,
  };
}
