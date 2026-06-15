"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  marketingEmailsEnabled: boolean;
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
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | null>(
    null,
  );
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

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

  const startBillingFlow = async () => {
    const action = user?.plan === "pro" ? "portal" : "checkout";
    setBillingAction(action);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        action === "portal" ? "/api/stripe/portal" : "/api/stripe/checkout",
        { method: "POST" },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to open billing");
      }

      window.location.href = payload.url;
    } catch (caught) {
      setBillingAction(null);
      setError(caught instanceof Error ? caught.message : "Unable to open billing");
    }
  };

  const startTwoFactorSetup = async () => {
    setMessage(null);
    setError(null);
    setRecoveryCodes([]);

    try {
      const response = await fetch("/api/account/2fa/setup", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to start 2FA setup");
      }

      setTwoFactorSetup(payload);
      setMessage("Scan the setup link or enter the secret in your authenticator app.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start 2FA setup");
    }
  };

  const enableTwoFactor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFactorCode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to enable 2FA");
      }

      setUser(payload.user);
      setRecoveryCodes(payload.recoveryCodes ?? []);
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      setMessage("Two-factor authentication is now enabled.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to enable 2FA");
    }
  };

  const disableTwoFactor = async () => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: twoFactorPassword }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to disable 2FA");
      }

      setUser(payload.user);
      setTwoFactorPassword("");
      setRecoveryCodes([]);
      setMessage("Two-factor authentication has been disabled.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to disable 2FA");
    }
  };

  const regenerateRecoveryCodes = async () => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/2fa/recovery-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: twoFactorPassword }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to regenerate recovery codes");
      }

      setRecoveryCodes(payload.recoveryCodes ?? []);
      setTwoFactorPassword("");
      setMessage("New recovery codes generated. Save them now.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to regenerate recovery codes",
      );
    }
  };

  const updateEmailPreferences = async (enabled: boolean) => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingEmailsEnabled: enabled }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update email preferences");
      }

      setUser((current) =>
        current
          ? {
              ...current,
              marketingEmailsEnabled: payload.marketingEmailsEnabled,
            }
          : current,
      );
      setMessage("Email preferences updated.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update email preferences",
      );
    }
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

        <div className="mt-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Billing</h2>
              <p className="mt-1 text-sm text-black/60">
                Plan: <span className="font-semibold capitalize">{user.plan}</span>
                {" · "}
                Status:{" "}
                <span className="font-semibold capitalize">
                  {user.subscriptionStatus.replaceAll("_", " ")}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void startBillingFlow()}
              disabled={billingAction !== null}
              className="rounded-full border border-black bg-kiwi-green px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              {billingAction
                ? "Opening..."
                : user.plan === "pro"
                  ? "Manage billing"
                  : "Go Pro"}
            </button>
          </div>
        </div>

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

        <div className="mt-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-bold">Email preferences</h2>
          <p className="mt-1 text-sm leading-6 text-black/60">
            Transactional emails like password resets and billing notices always
            send. Follow-up emails are optional.
          </p>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={user.marketingEmailsEnabled}
              onChange={(event) =>
                void updateEmailPreferences(event.target.checked)
              }
              className="h-4 w-4"
            />
            Receive follow-up emails about my previews and Kiwi Pro
          </label>
        </div>

        <div className="mt-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Two-factor authentication</h2>
              <p className="mt-1 text-sm leading-6 text-black/60">
                {user.twoFactorEnabled
                  ? "2FA is enabled. You will need an authenticator code when logging in."
                  : "Add an authenticator app code to protect your account."}
              </p>
            </div>
            {!user.twoFactorEnabled ? (
              <button
                type="button"
                onClick={() => void startTwoFactorSetup()}
                className="rounded-full border border-black bg-kiwi-green px-5 py-3 text-sm font-semibold text-black"
              >
                Set up 2FA
              </button>
            ) : null}
          </div>

          {twoFactorSetup ? (
            <form onSubmit={enableTwoFactor} className="mt-5 rounded-3xl bg-[#faf8f1] p-5">
              <p className="text-sm font-semibold">Add this to your authenticator app</p>
              <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs text-black/70">
                {twoFactorSetup.secret}
              </p>
              <a
                href={twoFactorSetup.otpauthUrl}
                className="mt-3 inline-block text-sm font-medium underline"
              >
                Open authenticator setup link
              </a>
              <input
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                placeholder="6-digit code"
                autoComplete="one-time-code"
                className="mt-4 h-11 w-full rounded-full border border-black/10 px-4 text-sm outline-none focus:border-black/30"
              />
              <button
                disabled={!twoFactorCode.trim()}
                className="mt-3 rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Verify and enable
              </button>
            </form>
          ) : null}

          {user.twoFactorEnabled ? (
            <div className="mt-5 rounded-3xl bg-[#faf8f1] p-5">
              <label
                className="block text-sm font-medium"
                htmlFor="two-factor-password"
              >
                Password
              </label>
              <input
                id="two-factor-password"
                type="password"
                value={twoFactorPassword}
                onChange={(event) => setTwoFactorPassword(event.target.value)}
                placeholder="Confirm your password"
                className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void regenerateRecoveryCodes()}
                  disabled={!twoFactorPassword}
                  className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  Regenerate recovery codes
                </button>
                <button
                  type="button"
                  onClick={() => void disableTwoFactor()}
                  disabled={!twoFactorPassword}
                  className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  Disable 2FA
                </button>
              </div>
            </div>
          ) : null}

          {recoveryCodes.length > 0 ? (
            <div className="mt-5 rounded-3xl border border-yellow-200 bg-yellow-50 p-5">
              <p className="text-sm font-semibold">Save these recovery codes now</p>
              <p className="mt-1 text-sm text-black/60">
                Each code can be used once if you lose your authenticator app.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-semibold"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </div>

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
