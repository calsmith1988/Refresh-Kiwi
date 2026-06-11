export const JOB_STATUSES = [
  "queued",
  "analyzing",
  "building_homepage",
  "homepage_ready",
  "building_pages",
  "complete",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const PAGE_STATUSES = ["pending", "building", "ready"] as const;

export type PageStatus = (typeof PAGE_STATUSES)[number];

export const STATUS_MESSAGES: Record<JobStatus, string> = {
  queued: "Starting your refresh…",
  analyzing: "Pulling information from your website…",
  building_homepage: "Rebuilding your homepage…",
  homepage_ready: "Your refreshed homepage is ready!",
  building_pages: "Creating your other pages in the background…",
  complete: "Your refreshed site is ready!",
  failed: "Something went wrong. Please try again.",
};

export interface JobResponse {
  id: string;
  sourceUrl: string;
  slug: string;
  websiteId: string | null;
  brandName: string | null;
  status: JobStatus;
  statusMessage: string;
  /** Status of the saved website, when one exists for this job. */
  websiteStatus: "preview" | "live" | "expired" | "archived" | null;
  previewUrl: string | null;
  expiresAt: string | null;
  freeEditsRemaining: number | null;
  isClaimed: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
