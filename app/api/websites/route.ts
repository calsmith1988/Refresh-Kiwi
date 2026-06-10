import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getLatestEditRequestsForUser,
  listOwnedWebsites,
  toWebsiteResponse,
} from "@/lib/websites/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view websites" }, { status: 401 });
  }

  const [websites, latestEditRequests] = await Promise.all([
    listOwnedWebsites(user.id),
    getLatestEditRequestsForUser(user.id),
  ]);

  return NextResponse.json({
    websites: websites.map((website) => {
      const latestEditRequest = latestEditRequests.get(website.id);

      return {
        ...toWebsiteResponse(website),
        latestEditRequest: latestEditRequest
          ? {
              id: latestEditRequest.id,
              prompt: latestEditRequest.prompt,
              status: latestEditRequest.status,
              errorMessage: latestEditRequest.errorMessage,
              createdAt: latestEditRequest.createdAt.toISOString(),
              updatedAt: latestEditRequest.updatedAt.toISOString(),
            }
          : null,
      };
    }),
  });
}
