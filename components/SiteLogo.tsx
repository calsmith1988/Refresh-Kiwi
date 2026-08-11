import Image from "next/image";
import Link from "next/link";

type SiteLogoProps = {
  href?: string;
  priority?: boolean;
  className?: string;
  /** Header scales the word mark down on narrow screens; footers keep full size. */
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
      aria-label="Refresh Kiwi"
      className={`flex min-w-0 items-center gap-2 min-[400px]:gap-2.5 ${className}`.trim()}
    >
      <Image
        src="/refresh-kiwi-favicon-v2.png"
        alt=""
        width={30}
        height={30}
        priority={priority}
        aria-hidden
        className="h-7 w-7 shrink-0 rounded-full min-[400px]:h-[30px] min-[400px]:w-[30px]"
      />
      <span
        className={`truncate font-dosis font-medium leading-none tracking-tight ${
          wordmark === "always"
            ? "inline-block text-[27px]"
            : "inline-block text-[17px] min-[360px]:text-[21px] min-[400px]:text-[27px]"
        }`}
      >
        Refresh Kiwi
      </span>
    </Link>
  );
}
