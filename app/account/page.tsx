"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

import ModalCloseButton from "@/components/ModalCloseButton";
import SiteLogo from "@/components/SiteLogo";
import { usePricing } from "@/components/usePricing";

const DELETE_HOLD_MS = 6000;

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

type WebsiteSummary = {
  id: string;
};

type AccountModal =
  | "name"
  | "email"
  | "password"
  | "twofactor"
  | "delete"
  | null;

function SettingRow({
  label,
  value,
  chip,
  action,
}: {
  label: string;
  value: React.ReactNode;
  chip?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-black/5 py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-black">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="break-all text-sm leading-6 text-black/55">{value}</div>
          {chip}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function RowButton({
  children,
  onClick,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}) {
  const styles =
    variant === "danger"
      ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
      : variant === "primary"
        ? "border-transparent bg-kiwi-green text-black hover:bg-kiwi-green-hover"
        : "border-black/10 bg-white text-black hover:border-black/25";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-10 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export default function AccountPage() {
  const { pricing } = usePricing();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [websiteCount, setWebsiteCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteHoldActive, setDeleteHoldActive] = useState(false);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const deleteHoldFrameRef = useRef<number | null>(null);
  const deleteHoldStartedAtRef = useRef<number | null>(null);
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<AccountModal>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetch("/api/auth/me").then((response) => response.json()),
      fetch("/api/websites")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ])
      .then(
        ([mePayload, websitesPayload]: [
          { user: AuthUser | null },
          { websites?: WebsiteSummary[] } | null,
        ]) => {
          if (cancelled) {
            return;
          }

          setUser(mePayload.user);
          setName(mePayload.user?.name ?? "");
          setWebsiteCount(websitesPayload?.websites?.length ?? null);
        },
      )
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openModal = (modal: AccountModal) => {
    setModalError(null);
    setError(null);
    setActiveModal(modal);
  };

  const cancelDeleteHold = () => {
    if (deleteHoldFrameRef.current !== null) {
      window.cancelAnimationFrame(deleteHoldFrameRef.current);
      deleteHoldFrameRef.current = null;
    }

    deleteHoldStartedAtRef.current = null;
    setDeleteHoldActive(false);
    setDeleteHoldProgress(0);
  };

  const closeModal = () => {
    cancelDeleteHold();
    setActiveModal(null);
    setModalError(null);
    setTwoFactorSetup(null);
    setTwoFactorCode("");
    setTwoFactorPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setNewEmail("");
    setEmailChangePassword("");
    setName(user?.name ?? "");
  };

  useEffect(() => {
    return () => {
      if (deleteHoldFrameRef.current !== null) {
        window.cancelAnimationFrame(deleteHoldFrameRef.current);
      }
    };
  }, []);

  const updateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setModalError(null);
    setIsSavingName(true);

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
      setMessage("Name updated.");
      setActiveModal(null);
    } catch (caught) {
      setModalError(
        caught instanceof Error ? caught.message : "Unable to update account",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setModalError(null);
    setIsChangingPassword(true);

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
      setActiveModal(null);
    } catch (caught) {
      setModalError(
        caught instanceof Error ? caught.message : "Unable to change password",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const requestEmailUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setModalError(null);
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
      setActiveModal(null);
    } catch (caught) {
      setModalError(
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

  const deleteCurrentAccount = async () => {
    setMessage(null);
    setModalError(null);
    setIsDeletingAccount(true);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete account");
      }

      window.localStorage.removeItem("refresh-kiwi:active-job");
      window.location.href = "/";
    } catch (caught) {
      setModalError(
        caught instanceof Error ? caught.message : "Unable to delete account",
      );
      setIsDeletingAccount(false);
    }
  };

  const startDeleteHold = () => {
    if (isDeletingAccount || deleteHoldActive) {
      return;
    }

    cancelDeleteHold();
    deleteHoldStartedAtRef.current = performance.now();
    setDeleteHoldActive(true);
    setDeleteHoldProgress(0);

    const tick = (timestamp: number) => {
      const startedAt = deleteHoldStartedAtRef.current;

      if (startedAt === null) {
        return;
      }

      const progress = Math.min(1, (timestamp - startedAt) / DELETE_HOLD_MS);
      setDeleteHoldProgress(progress);

      if (progress >= 1) {
        deleteHoldStartedAtRef.current = null;
        deleteHoldFrameRef.current = null;
        setDeleteHoldActive(false);
        setDeleteHoldProgress(0);
        void deleteCurrentAccount();
        return;
      }

      deleteHoldFrameRef.current = window.requestAnimationFrame(tick);
    };

    deleteHoldFrameRef.current = window.requestAnimationFrame(tick);
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
    setModalError(null);
    setRecoveryCodes([]);

    try {
      const response = await fetch("/api/account/2fa/setup", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to start 2FA setup");
      }

      setTwoFactorSetup(payload);
    } catch (caught) {
      setModalError(
        caught instanceof Error ? caught.message : "Unable to start 2FA setup",
      );
    }
  };

  const enableTwoFactor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setModalError(null);

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
      setModalError(
        caught instanceof Error ? caught.message : "Unable to enable 2FA",
      );
    }
  };

  const disableTwoFactor = async () => {
    setMessage(null);
    setModalError(null);

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
      setActiveModal(null);
    } catch (caught) {
      setModalError(
        caught instanceof Error ? caught.message : "Unable to disable 2FA",
      );
    }
  };

  const regenerateRecoveryCodes = async () => {
    setMessage(null);
    setModalError(null);

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
      setModalError(
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

  const closeModalOnBackdrop = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      // Don't dismiss while recovery codes are shown — user must acknowledge.
      if (recoveryCodes.length > 0 && activeModal === "twofactor") {
        return;
      }
      closeModal();
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
        <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm font-medium text-black/55 shadow-xl">
          Loading account settings...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf8f1] px-5 text-[#141811]">
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 text-center shadow-2xl sm:p-8">
          <h1 className="font-fraunces text-2xl font-semibold tracking-tight">
            Sign in required
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Log in to manage your profile, password, billing, and security
            settings.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to homepage
          </Link>
        </div>
      </main>
    );
  }

  const planLabel = user.plan === "pro" ? "Kiwi Pro" : "Free";
  const subscriptionLabel = user.subscriptionStatus.replaceAll("_", " ");
  const websiteLimit = user.plan === "pro" ? 3 : 1;
  const displayName = user.name?.trim() || "Not set";

  return (
    <main className="min-h-screen bg-[#faf8f1] px-5 py-5 text-[#141811] sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-black/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <SiteLogo />
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

        <section className="mt-8">
          <h1 className="font-fraunces text-3xl font-semibold tracking-tight sm:text-4xl">
            Account
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/55">
            Signed in as{" "}
            <span className="font-semibold text-black">{user.email}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-kiwi-green px-3 py-1 text-xs font-semibold capitalize text-black">
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
        </section>

        {message ? (
          <div className="mt-5 rounded-2xl border border-[#bfe262] bg-[#f4fbe8] px-4 py-3 text-sm font-medium text-[#315a16]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!user.emailVerified ? (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Verify your email address</p>
              <p className="mt-1 text-sm leading-6 text-black/60">
                Helps keep password resets and account emails reliable.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void resendVerification()}
              className="h-10 shrink-0 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold transition hover:border-black/25"
            >
              Resend verification
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {/* Profile & sign-in */}
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
            <h2 className="font-fraunces text-xl font-semibold tracking-tight">
              Profile &amp; sign-in
            </h2>
            <p className="mt-1 text-sm leading-6 text-black/55">
              Your name, email, and password.
            </p>
            <div className="mt-4">
              <SettingRow
                label="Name"
                value={displayName}
                action={
                  <RowButton
                    onClick={() => {
                      setName(user.name ?? "");
                      openModal("name");
                    }}
                  >
                    Change
                  </RowButton>
                }
              />
              <SettingRow
                label="Email"
                value={user.email}
                chip={
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.emailVerified
                        ? "bg-[#f0f4e7] text-black/55"
                        : "bg-yellow-50 text-yellow-800"
                    }`}
                  >
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </span>
                }
                action={
                  <RowButton onClick={() => openModal("email")}>Change</RowButton>
                }
              />
              <SettingRow
                label="Password"
                value="••••••••"
                action={
                  <RowButton onClick={() => openModal("password")}>
                    Change
                  </RowButton>
                }
              />
            </div>
          </section>

          {/* Security */}
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
            <h2 className="font-fraunces text-xl font-semibold tracking-tight">
              Security
            </h2>
            <p className="mt-1 text-sm leading-6 text-black/55">
              Extra protection and signed-in devices.
            </p>
            <div className="mt-4">
              <SettingRow
                label="Two-factor authentication"
                value={
                  user.twoFactorEnabled
                    ? "Authenticator app required at login"
                    : "Optional — add an authenticator app"
                }
                chip={
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.twoFactorEnabled
                        ? "bg-kiwi-green text-black"
                        : "bg-black/5 text-black/45"
                    }`}
                  >
                    {user.twoFactorEnabled ? "Enabled" : "Off"}
                  </span>
                }
                action={
                  <RowButton
                    variant={user.twoFactorEnabled ? "default" : "primary"}
                    onClick={() => {
                      setRecoveryCodes([]);
                      setTwoFactorSetup(null);
                      openModal("twofactor");
                    }}
                  >
                    {user.twoFactorEnabled ? "Manage" : "Set up"}
                  </RowButton>
                }
              />
              <SettingRow
                label="Sessions"
                value="Sign out of this device, or everywhere if you used a shared computer."
                action={
                  <div className="flex flex-col gap-2 sm:items-end">
                    <RowButton onClick={() => void logout()}>
                      Log out of this device
                    </RowButton>
                    <RowButton
                      disabled={isSigningOutEverywhere}
                      onClick={() => void signOutEverywhere()}
                    >
                      {isSigningOutEverywhere
                        ? "Signing out..."
                        : "Sign out everywhere"}
                    </RowButton>
                  </div>
                }
              />
            </div>
          </section>

          {/* Billing & emails */}
          <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
            <h2 className="font-fraunces text-xl font-semibold tracking-tight">
              Billing &amp; emails
            </h2>
            <p className="mt-1 text-sm leading-6 text-black/55">
              Your plan, payments, and optional follow-ups.
            </p>
            <div className="mt-4">
              <SettingRow
                label="Current plan"
                value={planLabel}
                chip={
                  <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-semibold capitalize text-black/55">
                    {subscriptionLabel}
                  </span>
                }
              />
              <SettingRow
                label="Websites"
                value={
                  websiteCount !== null
                    ? `Using ${websiteCount} of ${websiteLimit}`
                    : `Up to ${websiteLimit} ${websiteLimit === 1 ? "website" : "websites"}`
                }
              />
              <div className="border-t border-black/5 py-4">
                <button
                  type="button"
                  onClick={() => void startBillingFlow()}
                  disabled={billingAction !== null}
                  className="h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {billingAction
                    ? "Opening..."
                    : user.plan === "pro"
                      ? "Manage billing"
                      : `Put my website online — ${pricing.proPriceShort}`}
                </button>
                {user.plan === "pro" ? (
                  <button
                    type="button"
                    onClick={() => void startBillingFlow()}
                    disabled={billingAction !== null}
                    className="mt-2 h-11 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-black transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-2 sm:mt-0 sm:w-auto"
                  >
                    View invoices
                  </button>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-black/45">
                  Payments and invoices are handled securely by Stripe.
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-black/5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">
                    Follow-up emails
                  </p>
                  <p className="mt-1 text-sm leading-6 text-black/55">
                    Optional emails about your previews and Kiwi Pro.
                    Password resets and billing notices always send.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={user.marketingEmailsEnabled}
                  onClick={() =>
                    void updateEmailPreferences(!user.marketingEmailsEnabled)
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    user.marketingEmailsEnabled
                      ? "bg-kiwi-green"
                      : "bg-black/15"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      user.marketingEmailsEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-xl shadow-black/5 sm:p-6">
            <h2 className="font-fraunces text-xl font-semibold tracking-tight">
              Danger zone
            </h2>
            <p className="mt-1 text-sm leading-6 text-black/55">
              Permanent actions for this account.
            </p>
            <div className="mt-4">
              <SettingRow
                label="Delete account"
                value="Archives your websites, removes custom domains, and deletes your login. Pro users should cancel billing first."
                action={
                  <RowButton
                    variant="danger"
                    onClick={() => openModal("delete")}
                  >
                    Delete account
                  </RowButton>
                }
              />
            </div>
          </section>
        </div>
      </div>

      {/* ─── Name modal ─── */}
      {activeModal === "name" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-name-title"
          onMouseDown={closeModalOnBackdrop}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-name-title"
                  className="font-fraunces text-2xl font-semibold tracking-tight"
                >
                  Change name
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  This is the display name on your account.
                </p>
              </div>
              <ModalCloseButton onClick={closeModal} />
            </div>
            <form onSubmit={updateProfile} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-black">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                />
              </label>
              {modalError ? (
                <p
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                  role="alert"
                >
                  {modalError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSavingName}
                className="h-12 w-full rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingName ? "Saving..." : "Save name"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ─── Email modal ─── */}
      {activeModal === "email" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-email-title"
          onMouseDown={closeModalOnBackdrop}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-email-title"
                  className="font-fraunces text-2xl font-semibold tracking-tight"
                >
                  Change email
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  Current email:{" "}
                  <span className="font-semibold text-black">{user.email}</span>
                </p>
              </div>
              <ModalCloseButton onClick={closeModal} />
            </div>
            <form onSubmit={requestEmailUpdate} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-black">New email</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="new@email.com"
                  autoComplete="email"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-black">
                  Current password
                </span>
                <input
                  type="password"
                  value={emailChangePassword}
                  onChange={(event) => setEmailChangePassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black/30"
                />
              </label>
              <p className="text-xs leading-5 text-black/45">
                We&apos;ll send a confirmation link to the new address. Your email
                only changes after you open that link.
              </p>
              {modalError ? (
                <p
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                  role="alert"
                >
                  {modalError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={
                  isRequestingEmailChange ||
                  !newEmail.trim() ||
                  !emailChangePassword
                }
                className="h-12 w-full rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRequestingEmailChange
                  ? "Sending confirmation..."
                  : "Send confirmation link"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ─── Password modal ─── */}
      {activeModal === "password" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-password-title"
          onMouseDown={closeModalOnBackdrop}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-password-title"
                  className="font-fraunces text-2xl font-semibold tracking-tight"
                >
                  Change password
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  Use at least 8 characters. You&apos;ll stay signed in after
                  changing it.
                </p>
              </div>
              <ModalCloseButton onClick={closeModal} />
            </div>
            <form onSubmit={changePassword} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-black">
                  Current password
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black/30"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-black">
                  New password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none focus:border-black/30"
                />
              </label>
              {modalError ? (
                <p
                  className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                  role="alert"
                >
                  {modalError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  newPassword.length < 8
                }
                className="h-12 w-full rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChangingPassword ? "Saving..." : "Change password"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* ─── 2FA modal ─── */}
      {activeModal === "twofactor" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-2fa-title"
          onMouseDown={closeModalOnBackdrop}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-2fa-title"
                  className="font-fraunces text-2xl font-semibold tracking-tight"
                >
                  {recoveryCodes.length > 0
                    ? "Save your recovery codes"
                    : user.twoFactorEnabled
                      ? "Manage 2FA"
                      : "Set up 2FA"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  {recoveryCodes.length > 0
                    ? "Each code can be used once if you lose your authenticator app."
                    : user.twoFactorEnabled
                      ? "Regenerate recovery codes, or turn 2FA off."
                      : "Add an authenticator app for extra protection at login."}
                </p>
              </div>
              {recoveryCodes.length === 0 ? (
                <ModalCloseButton onClick={closeModal} />
              ) : null}
            </div>

            {modalError ? (
              <p
                className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                role="alert"
              >
                {modalError}
              </p>
            ) : null}

            {recoveryCodes.length > 0 ? (
              <div className="mt-6">
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
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
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryCodes([]);
                    setActiveModal(null);
                  }}
                  className="mt-5 h-12 w-full rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  I&apos;ve saved these codes
                </button>
              </div>
            ) : !user.twoFactorEnabled && !twoFactorSetup ? (
              <button
                type="button"
                onClick={() => void startTwoFactorSetup()}
                className="mt-6 h-12 w-full rounded-full bg-kiwi-green px-5 text-sm font-semibold text-black transition hover:bg-kiwi-green-hover"
              >
                Start setup
              </button>
            ) : null}

            {twoFactorSetup ? (
              <form onSubmit={enableTwoFactor} className="mt-6 space-y-4">
                <div className="rounded-2xl bg-[#faf8f1] p-4">
                  <p className="text-sm font-semibold text-black">
                    Scan this with your authenticator app
                  </p>
                  <div className="mt-3 flex justify-center rounded-2xl bg-white p-4">
                    <QRCodeSVG
                      value={twoFactorSetup.otpauthUrl}
                      size={168}
                      marginSize={1}
                      aria-label="Two-factor authentication setup QR code"
                    />
                  </div>
                  <p className="mt-3 text-xs text-black/50">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <p className="mt-1 break-all rounded-2xl bg-white p-3 font-mono text-xs text-black/70">
                    {twoFactorSetup.secret}
                  </p>
                  <a
                    href={twoFactorSetup.otpauthUrl}
                    className="mt-3 inline-block text-sm font-semibold underline underline-offset-2"
                  >
                    Open authenticator setup link
                  </a>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-black">
                    6-digit code
                  </span>
                  <input
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!twoFactorCode.trim()}
                  className="h-12 w-full rounded-full bg-[#141811] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Verify and enable
                </button>
              </form>
            ) : null}

            {user.twoFactorEnabled && recoveryCodes.length === 0 ? (
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-black">
                    Confirm your password
                  </span>
                  <input
                    type="password"
                    value={twoFactorPassword}
                    onChange={(event) => setTwoFactorPassword(event.target.value)}
                    placeholder="Password"
                    className="mt-2 h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void regenerateRecoveryCodes()}
                  disabled={!twoFactorPassword}
                  className="h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate recovery codes
                </button>
                <button
                  type="button"
                  onClick={() => void disableTwoFactor()}
                  disabled={!twoFactorPassword}
                  className="h-12 w-full rounded-full border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Disable 2FA
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ─── Delete account modal ─── */}
      {activeModal === "delete" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-delete-title"
          onMouseDown={closeModalOnBackdrop}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-5 py-4 backdrop-blur-sm sm:items-center"
        >
          <div className="preview-pop max-h-[90vh] w-full max-w-md modal-scroll overflow-y-auto rounded-3xl border border-red-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-delete-title"
                  className="font-fraunces text-2xl font-semibold tracking-tight"
                >
                  Delete your account?
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  This archives your websites, removes custom-domain links, and
                  deletes your login. This can&apos;t be undone.
                </p>
              </div>
              <ModalCloseButton onClick={closeModal} />
            </div>
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/50 p-4">
              <p className="text-sm leading-6 text-black/60">
                Keep holding until the button fills. This can&apos;t be undone.
              </p>
              {modalError ? (
                <p
                  className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                  role="alert"
                >
                  {modalError}
                </p>
              ) : null}
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  startDeleteHold();
                }}
                onPointerUp={cancelDeleteHold}
                onPointerLeave={cancelDeleteHold}
                onPointerCancel={cancelDeleteHold}
                onLostPointerCapture={cancelDeleteHold}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    startDeleteHold();
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    cancelDeleteHold();
                  }
                }}
                disabled={isDeletingAccount}
                aria-label="Press and hold to delete your account"
                draggable={false}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                className="relative mt-4 h-12 w-full touch-none select-none overflow-hidden rounded-full border border-red-700 bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-red-900/35"
                  style={{
                    width: deleteHoldActive
                      ? `${Math.round(deleteHoldProgress * 100)}%`
                      : "0%",
                  }}
                />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {isDeletingAccount
                    ? "Deleting..."
                    : deleteHoldActive
                      ? "Keep holding..."
                      : "Hold to delete account"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
