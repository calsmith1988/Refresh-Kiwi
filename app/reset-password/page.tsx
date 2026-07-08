"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to reset password");
      }

      setMessage("Your password has been reset. You can now log in.");
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl">
        <p className="font-roboto text-[32px] font-[350] tracking-tight">refresh kiwi</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          Use at least 8 characters. Reset links expire after 30 minutes.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="h-12 w-full rounded-full border border-black/10 px-5 text-sm outline-none focus:border-black/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || !token || password.length < 8}
            className="h-12 w-full rounded-full border border-black bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:opacity-50"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
        {!token ? (
          <p className="mt-4 text-sm text-red-600">This reset link is missing a token.</p>
        ) : null}
        {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
