// Offline checks for the website security changes. No build, no server.
//   node test_website_security.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}   ${detail}`); }
};

// ── [1] next.config.mjs security headers (imports the REAL config) ────────────
console.log("\n[1] next.config.mjs security headers");
const cfg = (await import("./next.config.mjs")).default;
const routes = await cfg.headers();
const hdrs = Object.fromEntries(routes[0].headers.map((h) => [h.key, h.value]));

check("applies to all routes", routes[0].source === "/:path*");
check("X-Frame-Options: DENY", hdrs["X-Frame-Options"] === "DENY");
check("X-Content-Type-Options: nosniff", hdrs["X-Content-Type-Options"] === "nosniff");
check("Referrer-Policy set", (hdrs["Referrer-Policy"] || "").includes("strict-origin"));
check("Permissions-Policy present", !!hdrs["Permissions-Policy"]);
const csp = hdrs["Content-Security-Policy-Report-Only"] || "";
check("CSP shipped Report-Only (safe rollout)", !!csp);
check("CSP has frame-ancestors 'none'", csp.includes("frame-ancestors 'none'"));
check("CSP allows storage.googleapis.com images", csp.includes("https://storage.googleapis.com"));
check("CSP allows App Check endpoint", csp.includes("firebaseappcheck.googleapis.com"));
check("CSP object-src 'none'", csp.includes("object-src 'none'"));

// ── [2] marketplace download proxy allow-list (source guard + logic replica) ──
console.log("\n[2] marketplace download proxy allow-list");
const route = readFileSync(
  "src/app/api/marketplace/download/route.ts", "utf8");
check("locks host to storage.googleapis.com", route.includes('"storage.googleapis.com"'));
check("locks to the project bucket", route.includes("upoksp-gk-backend.firebasestorage.app"));
check("requires /marketplace/ prefix", route.includes("/marketplace/"));
check("requires .craft extension", route.includes('.endsWith(".craft")'));
check("requires https", route.includes('=== "https:"'));

// Replicate the allow-list and prove a SIGNED marketplace URL still passes.
const HOST = "storage.googleapis.com";
const BUCKET = "upoksp-gk-backend.firebasestorage.app";
const allows = (u) => {
  let t; try { t = new URL(u); } catch { return false; }
  return t.protocol === "https:" && t.host === HOST
    && t.pathname.startsWith(`/${BUCKET}/marketplace/`)
    && t.pathname.toLowerCase().endsWith(".craft");
};
const signed = `https://${HOST}/${BUCKET}/marketplace/L1/coolship.craft`
  + "?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Signature=deadbeef";
check("signed marketplace .craft URL passes", allows(signed));
check("rejects non-storage host", !allows("https://evil.example/" + BUCKET + "/marketplace/x.craft"));
check("rejects non-marketplace prefix",
  !allows(`https://${HOST}/${BUCKET}/contracts/x.craft`));
check("rejects non-.craft", !allows(`https://${HOST}/${BUCKET}/marketplace/L1/blueprint.png`));
check("rejects http", !allows(`http://${HOST}/${BUCKET}/marketplace/x.craft`));

// ── [3] Firebase rules are default-deny ───────────────────────────────────────
console.log("\n[3] Firebase security rules (default-deny)");
const fs = readFileSync("firestore.rules", "utf8");
const st = readFileSync("storage.rules", "utf8");
check("firestore.rules denies read+write", /allow read, write:\s*if false;/.test(fs));
check("storage.rules denies read+write", /allow read, write:\s*if false;/.test(st));
const fbjson = JSON.parse(readFileSync("firebase.json", "utf8"));
check("firebase.json wires firestore rules", fbjson.firestore?.rules === "firestore.rules");
check("firebase.json wires storage rules", fbjson.storage?.rules === "storage.rules");

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
