import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type PlaywrightChromium = {
  launch(options: { args: string[] }): Promise<{ close(): Promise<void> }>;
};

async function loadChromium(): Promise<PlaywrightChromium> {
  const importModule = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<{ chromium: PlaywrightChromium }>;
  const { chromium } = await importModule("playwright");

  return chromium;
}

export async function GET() {
  try {
    const chromium = await loadChromium();
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
