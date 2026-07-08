"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("Checking your verification link...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing a token.");
      return;
    }

    setStatus("loading");
    void fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to verify email");
        }

        setStatus("success");
        setMessage("Your email has been verified.");
      })
      .catch((caught) => {
        setStatus("error");
        setMessage(caught instanceof Error ? caught.message : "Unable to verify email");
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 text-center shadow-xl">
        <p className="font-roboto text-[32px] font-[350] tracking-tight">refresh kiwi</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Email verification</h1>
        <p
          className={`mt-4 text-sm leading-6 ${
            status === "error" ? "text-red-600" : "text-black/60"
          }`}
        >
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-black bg-kiwi-green px-5 py-3 text-sm font-semibold text-black"
        >
          Back to Refresh Kiwi
        </Link>
      </div>
    </main>
  );
}
