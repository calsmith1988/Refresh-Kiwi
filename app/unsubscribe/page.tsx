"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const [message, setMessage] = useState("Updating your email preferences...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    if (!token) {
      setMessage("This unsubscribe link is missing a token.");
      setIsError(true);
      return;
    }

    void fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to unsubscribe");
        }

        setMessage("You have been unsubscribed from follow-up emails.");
      })
      .catch((error) => {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : "Unable to unsubscribe");
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 text-center shadow-xl">
        <p className="font-fraunces text-xl font-semibold">Refresh Kiwi</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Email preferences
        </h1>
        <p
          className={`mt-4 text-sm leading-6 ${
            isError ? "text-red-600" : "text-black/60"
          }`}
        >
          {message}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
          Back to Refresh Kiwi
        </Link>
      </div>
    </main>
  );
}
