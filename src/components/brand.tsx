import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/nav";

/** Project mark — the Boundless Missions logo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={`${siteConfig.name} logo`}
      width={32}
      height={32}
      priority
      className={cn(
        "h-8 w-8 rounded-md border border-primary/20",
        className
      )}
    />
  );
}

/** Patreon glyph — lucide-react does not ship a Patreon icon. */
export function PatreonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M15.386 1.5c-4.07 0-7.382 3.312-7.382 7.382 0 4.058 3.312 7.36 7.382 7.36 4.058 0 7.36-3.302 7.36-7.36 0-4.07-3.302-7.382-7.36-7.382zM1.25 22.5h3.604V1.5H1.25v21z" />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          {siteConfig.shortName}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Mission Control
        </span>
      </span>
    </Link>
  );
}
