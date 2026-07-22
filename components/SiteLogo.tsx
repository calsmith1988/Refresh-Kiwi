import Image from "next/image";
import Link from "next/link";

type SiteLogoProps = {
  href?: string;
  priority?: boolean;
  className?: string;
  /** Header hides the word mark on very small screens; footers keep it. */
  wordmark?: "responsive" | "always";
};

export default function SiteLogo({
  href = "/",
  priority = false,
  className = "",
  wordmark = "responsive",
}: SiteLogoProps) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 items-center gap-2.5 ${className}`.trim()}
    >
      <Image
        src="/refresh-kiwi-favicon-v2.png"
        alt=""
        width={30}
        height={30}
        priority={priority}
        aria-hidden
        className="shrink-0 rounded-full"
      />
      <span
        className={`truncate font-dosis text-[27px] font-medium leading-none tracking-tight ${
          wordmark === "always"
            ? "inline-block"
            : "hidden min-[400px]:inline-block"
        }`}
      >
        Refresh Kiwi
      </span>
    </Link>
  );
}
