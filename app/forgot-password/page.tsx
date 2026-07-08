"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to request reset link");
      }

      setMessage(payload.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to request reset link");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl">
        <p className="font-roboto text-xl font-medium tracking-tight">refresh kiwi</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          Enter your account email and we&apos;ll send a reset link if it exists.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            className="h-12 w-full rounded-full border border-black bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
