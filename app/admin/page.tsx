import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AdminDashboard from "@/components/AdminDashboard";
import { getAdminUser } from "@/lib/admin/guard";
import { noindexRobots } from "@/lib/seo/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Refresh Kiwi",
  robots: noindexRobots,
};

export default async function AdminPage() {
  const user = await getAdminUser();

  // Non-admins get the standard 404 — the admin surface shouldn't be
  // discoverable.
  if (!user) {
    notFound();
  }

  return <AdminDashboard adminEmail={user.email} />;
}
