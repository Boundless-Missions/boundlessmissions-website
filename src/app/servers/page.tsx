"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ServersCard } from "@/components/account/servers-card";
import { useServerAccess } from "@/lib/mp-servers";
import { useSignedIn } from "@/lib/session";

/**
 * /servers — multiplayer server management (ksp-mp-remote-host-admin.md).
 *
 * Not open to everyone yet: the owner, mapped guild admins and accounts on the
 * owner's tester list. The header only links it for them; anyone else who types
 * the URL gets the same "not available" as a page that does not exist, and the
 * bot refuses every call behind it regardless of what this page draws.
 */
export default function ServersPage() {
  const signedIn = useSignedIn();
  const access = useServerAccess();
  // useServerAccess is null both while probing and when refused; give the probe
  // a moment before concluding "no access", so a tester never sees a flash of it.
  const [settled, setSettled] = useState(false);
  const settle = useCallback(() => setSettled(true), []);
  useEffect(() => {
    if (signedIn !== true || access) return;
    const t = setTimeout(settle, 2500);
    return () => clearTimeout(t);
  }, [signedIn, access, settle]);

  let body: React.ReactNode;
  if (signedIn === null || (signedIn && !access && !settled)) {
    body = (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  } else if (!signedIn) {
    body = (
      <div className="py-16 text-center text-muted-foreground">
        <p className="mb-4">Sign in to manage your servers.</p>
        <Button asChild><Link href="/account">Sign in</Link></Button>
      </div>
    );
  } else if (!access) {
    body = (
      <p className="py-16 text-center text-muted-foreground">
        Server management isn&apos;t available to this account yet.
      </p>
    );
  } else {
    body = <ServersCard />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Servers</h1>
        {body}
      </main>
      <SiteFooter />
    </div>
  );
}
