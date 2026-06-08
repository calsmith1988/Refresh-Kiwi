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
  building_homepage: "Rebuilding your homepage — usually takes 2–3 minutes…",
  homepage_ready: "Your homepage is ready — building additional pages…",
  building_pages: "Creating your other pages in the background…",
  complete: "Your refreshed site is ready!",
  failed: "Something went wrong. Please try again.",
};

export interface JobResponse {
  id: string;
  sourceUrl: string;
  slug: string;
  brandName: string | null;
  status: JobStatus;
  statusMessage: string;
  previewUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
