"use client";

/**
 * session.ts — client-side read of the session hint cookie.
 *
 * The real session is httpOnly and unreadable from JS by design; this is the flag
 * cookie set beside it (see config/session.ts). Nothing here is a security check —
 * it only decides which navigation to draw.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { SESSION_HINT_COOKIE } from "@/config/session";

/** Fired after a link or logout, since cookie writes raise no event of their own. */
export const SESSION_CHANGED_EVENT = "bm:session";

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
}

/** Tell any mounted header to re-read the hint. Call after linking or logging out. */
export function notifySessionChanged(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

/**
 * Whether someone is signed in — `null` while it is not yet known.
 *
 * It is unknown during the server render and the first paint, because the cookie
 * can only be read once JS runs. Callers treat `null` as signed out: the anonymous
 * view is what a first-time visitor should get, and it is what the prerendered HTML
 * has to contain for crawlers. The consequence is a brief swap on hydration for
 * signed-in visitors, which is the price of keeping these pages statically
 * prerendered — reading the cookie on the server would make every page dynamic and
 * lose the CDN.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const read = () => setSignedIn(hasSessionHint());
    read();
    window.addEventListener(SESSION_CHANGED_EVENT, read);
    // Another tab signing in or out, and a tab left open past the cookie's life,
    // both change the answer here with no navigation of our own.
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, read);
      window.removeEventListener("focus", read);
    };
    // Re-read on navigation too: the server refreshes the hint on any authed call
    // (see `proxy`), so a session that predates this cookie heals on the next page.
  }, [pathname]);

  return signedIn;
}
