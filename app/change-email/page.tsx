"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import SiteLogo from "@/components/SiteLogo";

export default function ChangeEmailPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("Checking your email change link...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    if (!token) {
      setStatus("error");
      setMessage("This email change link is missing a token.");
      return;
    }

    setStatus("loading");
    void fetch("/api/account/email/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to change email");
        }

        setStatus("success");
        setMessage("Your Refresh Kiwi email address has been changed.");
      })
      .catch((caught) => {
        setStatus("error");
        setMessage(
          caught instanceof Error ? caught.message : "Unable to change email",
        );
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-7 text-center shadow-xl">
        <SiteLogo wordmark="always" className="justify-center" />
        <h1 className="mt-6 font-fraunces text-3xl font-semibold tracking-tight">
          Email change
        </h1>
        <p
          className={`mt-4 text-sm leading-6 ${
            status === "error" ? "text-red-600" : "text-black/60"
          }`}
        >
          {message}
        </p>
        <Link
          href={status === "success" ? "/account" : "/"}
          className="mt-6 inline-flex rounded-full bg-kiwi-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
        >
          {status === "success" ? "Back to account" : "Back to Refresh Kiwi"}
        </Link>
      </div>
    </main>
  );
}
