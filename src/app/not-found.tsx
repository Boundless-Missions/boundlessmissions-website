import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <BrandLogo />
      <div className="space-y-2">
        <p className="text-5xl font-bold tracking-tight text-primary">404</p>
        <h1 className="text-xl font-semibold">This trajectory missed.</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you were looking for is not in orbit. Head back and pick a
          new heading.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Return home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/docs">Open docs</Link>
        </Button>
      </div>
    </div>
  );
}
