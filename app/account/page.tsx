"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  plan: "free" | "pro";
  subscriptionStatus: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: AuthUser | null }) => {
        setUser(payload.user);
        setName(payload.user?.name ?? "");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update account");
      }

      setUser(payload.user);
      setMessage("Account updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update account");
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to change password");
      }

      setUser(payload.user);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to change password");
    }
  };

  const resendVerification = async () => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to resend verification email");
      }

      setMessage("Verification email sent.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to resend verification email",
      );
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  if (isLoading) {
    return <main className="p-8">Loading...</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5">
        <div className="rounded-[2rem] border border-black/10 p-6 text-center shadow-xl">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <Link href="/" className="mt-4 inline-block text-sm font-medium underline">
            Back to homepage
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium underline">
          Back to homepage
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="ml-4 text-sm font-medium underline"
        >
          Log out
        </button>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Account settings</h1>
        <p className="mt-2 text-sm text-black/60">{user.email}</p>

        {!user.emailVerified ? (
          <div className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-5">
            <p className="text-sm font-semibold">Verify your email address</p>
            <p className="mt-1 text-sm text-black/60">
              Verification helps keep account and recovery emails reliable.
            </p>
            <button
              type="button"
              onClick={() => void resendVerification()}
              className="mt-3 rounded-full border border-black bg-white px-4 py-2 text-sm font-semibold"
            >
              Resend verification email
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <form
            onSubmit={updateProfile}
            className="rounded-[2rem] border border-black/10 p-6 shadow-lg"
          >
            <h2 className="text-xl font-bold">Profile</h2>
            <label className="mt-4 block text-sm font-medium" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-full border border-black/10 px-4 text-sm outline-none focus:border-black/30"
            />
            <button className="mt-4 rounded-full border border-black bg-kiwi-green px-5 py-3 text-sm font-semibold">
              Save profile
            </button>
          </form>

          <form
            onSubmit={changePassword}
            className="rounded-[2rem] border border-black/10 p-6 shadow-lg"
          >
            <h2 className="text-xl font-bold">Password</h2>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              className="mt-4 h-11 w-full rounded-full border border-black/10 px-4 text-sm outline-none focus:border-black/30"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              className="mt-3 h-11 w-full rounded-full border border-black/10 px-4 text-sm outline-none focus:border-black/30"
            />
            <button
              disabled={!currentPassword || newPassword.length < 8}
              className="mt-4 rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Change password
            </button>
          </form>
        </div>

        {message ? <p className="mt-5 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
