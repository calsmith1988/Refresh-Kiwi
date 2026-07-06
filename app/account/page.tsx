"use client";

import Image from "next/image";
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
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
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

  const requestEmailUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsRequestingEmailChange(true);

    try {
      const response = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail,
          currentPassword: emailChangePassword,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to request email change");
      }

      setNewEmail("");
      setEmailChangePassword("");
      setMessage(
        `Check ${payload.newEmail} to confirm your new email address. Your account email will not change until you open that link.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to request email change",
      );
    } finally {
      setIsRequestingEmailChange(false);
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
    window.localStorage.removeItem("refresh-kiwi:active-job");
    window.location.href = "/";
  };

  const signOutEverywhere = async () => {
    setMessage(null);
    setError(null);
    setIsSigningOutEverywhere(true);

    try {
      const response = await fetch("/api/account/sessions", { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign out everywhere");
      }

      window.localStorage.removeItem("refresh-kiwi:active-job");
      window.location.href = "/";
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to sign out everywhere",
      );
      setIsSigningOutEverywhere(false);
    }
  };

  const deleteCurrentAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsDeletingAccount(true);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: deletePassword,
          confirmation: deleteConfirmation,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete account");
      }

      window.localStorage.removeItem("refresh-kiwi:active-job");
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete account");
      setIsDeletingAccount(false);
    }
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 text-sm font-medium text-black/55 shadow-xl">
          Loading account settings...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
        <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-7 text-center shadow-xl">
          <h1 className="font-fraunces text-3xl font-semibold tracking-tight">
            Sign in required
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Log in to manage your profile, password, billing, and security
            settings.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to homepage
          </Link>
        </div>
      </main>
    );
  }

  const planLabel = user.plan === "pro" ? "Kiwi Pro" : "Free";
  const subscriptionLabel = user.subscriptionStatus.replaceAll("_", " ");

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-5 text-[#141811] sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/refresh-kiwi-favicon-v2.png"
              alt=""
              width={34}
              height={34}
              aria-hidden
              className="shrink-0 rounded-full"
            />
            <span className="inline-block translate-y-[3px] truncate font-marhey text-2xl font-normal leading-none">
              Refresh Kiwi
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black/25"
            >
              My websites
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black"
            >
              Log out
            </button>
          </div>
        </header>

        <section className="mt-10 rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl shadow-black/5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#f0f4e7] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-black/45">
                Account
              </p>
              <h1 className="mt-4 font-fraunces text-4xl font-semibold tracking-tight sm:text-5xl">
                Profile &amp; settings
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/55">
                Manage how you sign in, keep your account secure, and update the
                billing or email preferences for your Refresh Kiwi websites.
              </p>
            </div>
            <div className="grid gap-2 text-sm sm:min-w-72">
              <div className="rounded-2xl bg-[#faf8f1] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
                  Signed in as
                </p>
                <p className="mt-1 break-all font-semibold">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-kiwi-green px-3 py-1 text-xs font-bold capitalize text-black">
                  {planLabel}
                </span>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold capitalize text-black/55">
                  {subscriptionLabel}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.emailVerified
                      ? "bg-[#f0f4e7] text-black/60"
                      : "bg-yellow-50 text-yellow-800"
                  }`}
                >
                  {user.emailVerified ? "Email verified" : "Email not verified"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {message ? (
          <div className="mt-5 rounded-3xl border border-[#bfe262] bg-[#f4fbe8] p-4 text-sm font-medium text-[#315a16]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!user.emailVerified ? (
          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Verify your email address</p>
              <p className="mt-1 text-sm leading-6 text-black/60">
                Verification helps keep password resets and account emails
                reliable.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void resendVerification()}
              className="h-11 shrink-0 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25"
            >
              Resend verification
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                    Profile
                  </p>
                  <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                    Your details
                  </h2>
                </div>
              </div>
              <form onSubmit={updateProfile} className="mt-5">
                <label className="block text-sm font-semibold" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                />
                <button className="mt-4 h-11 rounded-full bg-kiwi-green px-5 text-sm font-bold text-black transition hover:bg-kiwi-green-hover">
                  Save profile
                </button>
              </form>

              <form
                onSubmit={requestEmailUpdate}
                className="mt-6 rounded-3xl bg-[#faf8f1] p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Email address</p>
                    <p className="mt-1 break-all text-sm text-black/60">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      user.emailVerified
                        ? "bg-white text-black/45"
                        : "bg-yellow-50 text-yellow-800"
                    }`}
                  >
                    {user.emailVerified ? "Verified" : "Needs verification"}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">New email</span>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="new@email.com"
                      autoComplete="email"
                      className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Current password</span>
                    <input
                      type="password"
                      value={emailChangePassword}
                      onChange={(event) =>
                        setEmailChangePassword(event.target.value)
                      }
                      autoComplete="current-password"
                      className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
                    />
                  </label>
                </div>
                <button
                  disabled={
                    isRequestingEmailChange ||
                    !newEmail.trim() ||
                    !emailChangePassword
                  }
                  className="mt-4 h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRequestingEmailChange
                    ? "Sending confirmation..."
                    : "Send confirmation link"}
                </button>
                <p className="mt-3 text-xs leading-5 text-black/45">
                  We will send a confirmation link to the new address. Your email
                  changes only after that link is opened.
                </p>
              </form>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Password
              </p>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                Change password
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Use a password with at least 8 characters. You will keep your
                current session after changing it.
              </p>
              <form onSubmit={changePassword} className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold">Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    className="mt-2 h-12 w-full rounded-full border border-black/10 px-4 text-sm outline-none transition focus:border-black/30"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    className="mt-2 h-12 w-full rounded-full border border-black/10 px-4 text-sm outline-none transition focus:border-black/30"
                  />
                </label>
                <button
                  disabled={!currentPassword || newPassword.length < 8}
                  className="h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Change password
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                    Security
                  </p>
                  <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                    Two-factor authentication
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    {user.twoFactorEnabled
                      ? "2FA is enabled. You will need an authenticator code when logging in."
                      : "Add an authenticator app code for extra protection."}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    user.twoFactorEnabled
                      ? "bg-kiwi-green text-black"
                      : "bg-black/5 text-black/45"
                  }`}
                >
                  {user.twoFactorEnabled ? "Enabled" : "Optional"}
                </span>
              </div>

              {!user.twoFactorEnabled ? (
                <button
                  type="button"
                  onClick={() => void startTwoFactorSetup()}
                  className="mt-5 h-11 rounded-full bg-kiwi-green px-5 text-sm font-bold text-black transition hover:bg-kiwi-green-hover"
                >
                  Set up 2FA
                </button>
              ) : null}

              {twoFactorSetup ? (
                <form
                  onSubmit={enableTwoFactor}
                  className="mt-5 rounded-3xl bg-[#faf8f1] p-5"
                >
                  <p className="text-sm font-semibold">
                    Add this to your authenticator app
                  </p>
                  <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs text-black/70">
                    {twoFactorSetup.secret}
                  </p>
                  <a
                    href={twoFactorSetup.otpauthUrl}
                    className="mt-3 inline-block text-sm font-semibold underline underline-offset-2"
                  >
                    Open authenticator setup link
                  </a>
                  <input
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    placeholder="6-digit code"
                    autoComplete="one-time-code"
                    className="mt-4 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                  />
                  <button
                    disabled={!twoFactorCode.trim()}
                    className="mt-3 h-11 rounded-full bg-[#141811] px-5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Verify and enable
                  </button>
                </form>
              ) : null}

              {user.twoFactorEnabled ? (
                <div className="mt-5 rounded-3xl bg-[#faf8f1] p-5">
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="two-factor-password"
                  >
                    Confirm your password
                  </label>
                  <input
                    id="two-factor-password"
                    type="password"
                    value={twoFactorPassword}
                    onChange={(event) => setTwoFactorPassword(event.target.value)}
                    placeholder="Password"
                    className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void regenerateRecoveryCodes()}
                      disabled={!twoFactorPassword}
                      className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25 disabled:opacity-50"
                    >
                      Regenerate recovery codes
                    </button>
                    <button
                      type="button"
                      onClick={() => void disableTwoFactor()}
                      disabled={!twoFactorPassword}
                      className="h-11 rounded-full border border-red-200 bg-white px-5 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:opacity-50"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : null}

              {recoveryCodes.length > 0 ? (
                <div className="mt-5 rounded-3xl border border-yellow-200 bg-yellow-50 p-5">
                  <p className="text-sm font-semibold">
                    Save these recovery codes now
                  </p>
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
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Billing
              </p>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                Plan &amp; payment
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#faf8f1] px-4 py-3">
                  <dt className="text-black/50">Current plan</dt>
                  <dd className="font-semibold capitalize">{planLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#faf8f1] px-4 py-3">
                  <dt className="text-black/50">Subscription</dt>
                  <dd className="font-semibold capitalize">{subscriptionLabel}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void startBillingFlow()}
                disabled={billingAction !== null}
                className="mt-5 h-11 w-full rounded-full bg-kiwi-green px-5 text-sm font-bold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {billingAction
                  ? "Opening..."
                  : user.plan === "pro"
                    ? "Manage billing"
                    : "Go Pro"}
              </button>
              {user.plan === "pro" ? (
                <button
                  type="button"
                  onClick={() => void startBillingFlow()}
                  disabled={billingAction !== null}
                  className="mt-3 h-11 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View invoices and receipts
                </button>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-black/45">
                Payments and invoices are handled securely by Stripe.
              </p>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Emails
              </p>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                Email preferences
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Transactional emails like password resets and billing notices
                always send. Follow-up emails are optional.
              </p>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-3xl bg-[#faf8f1] p-4 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={user.marketingEmailsEnabled}
                  onChange={(event) =>
                    void updateEmailPreferences(event.target.checked)
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Receive follow-up emails about my previews and Kiwi Pro
                </span>
              </label>
            </section>

            <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                Account actions
              </p>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                Sessions
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Sign out of this device, or sign out everywhere if you used a
                shared computer.
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="h-11 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25"
                >
                  Log out of this device
                </button>
                <button
                  type="button"
                  onClick={() => void signOutEverywhere()}
                  disabled={isSigningOutEverywhere}
                  className="h-11 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black/60 transition hover:border-black/25 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSigningOutEverywhere
                    ? "Signing out..."
                    : "Sign out everywhere"}
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-red-100 bg-white p-6 shadow-xl shadow-black/5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-500/70">
                Danger zone
              </p>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold tracking-tight">
                Delete account
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/55">
                This archives your saved websites, removes custom-domain links,
                and deletes your login. Pro users should cancel billing first.
              </p>
              <form onSubmit={deleteCurrentAccount} className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold">Current password</span>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    autoComplete="current-password"
                    className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">
                    Type DELETE to confirm
                  </span>
                  <input
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black/30"
                  />
                </label>
                <button
                  disabled={
                    isDeletingAccount ||
                    !deletePassword ||
                    deleteConfirmation.trim().toUpperCase() !== "DELETE"
                  }
                  className="h-11 w-full rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingAccount ? "Deleting..." : "Delete my account"}
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
