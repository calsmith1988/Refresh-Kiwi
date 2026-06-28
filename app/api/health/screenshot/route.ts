import { NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    await browser.close();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Screenshot browser failed to launch",
      },
      { status: 500 },
    );
  }
}
