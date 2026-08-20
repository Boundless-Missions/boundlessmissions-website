"use client";

import { useEffect } from "react";
import { initAppCheck } from "@/lib/firebase";

/**
 * Initializes Firebase App Check once on the client so an attestation token is
 * warm before the first BFF call. No-op when App Check is off (empty site key).
 */
export function AppCheckInit() {
  useEffect(() => {
    initAppCheck();
  }, []);
  return null;
}
