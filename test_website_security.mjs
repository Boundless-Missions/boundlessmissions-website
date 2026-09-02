// Offline checks for the website security changes. No build, no server.
//   node test_website_security.mjs
import { readdirSync, readFileSync } from "node:fs";

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

// ── [4] App Check reaches every route that changes something ─────────────────
//
// The 0209 pass found the sign-in and TOTP calls sending no App Check header at
// all — a fail-closed outage nobody could see locally, because .env.local turns
// enforcement off. And it found the body of every JSON POST being buffered
// *before* the check that was going to reject it. Both are invisible to a type
// checker and to any test that does not run against production, so they are
// asserted on the source here.
console.log("\n[4] App Check placement");
const authLib = readFileSync("src/lib/auth.ts", "utf8");
check("auth.ts attaches the App Check header", authLib.includes("appCheckHeader"));
for (const path of ["/api/auth/signin", "/api/auth/totp", "/api/auth/logout"]) {
  check(`auth.ts uses authedFetch for ${path}`,
        authLib.includes(`authedFetch("${path}"`));
}
check("auth.ts leaves no bare safeFetch call", !/\bawait safeFetch\(/.test(authLib));

const logout = readFileSync("src/app/api/auth/logout/route.ts", "utf8");
check("logout is App-Check gated (no cross-origin forced sign-out)",
      logout.includes("await guard(req)"));

// Every handler that reads a body must refuse first. The guard has to come
// BEFORE the read, or it is not the fix — so the position is what is checked.
const routeFiles = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(full);
    else if (e.name === "route.ts") routeFiles.push(full);
  }
};
walk("src/app/api");
const READS_BODY = /req\.(json|text|formData|arrayBuffer)\(\)/;
let unguarded = [];
for (const f of routeFiles) {
  const src = readFileSync(f, "utf8");
  if (!READS_BODY.test(src)) continue;
  const guardAt = src.indexOf("await guard(req");
  if (guardAt === -1 || guardAt > src.search(READS_BODY)) unguarded.push(f);
}
check("every body-reading route guards before it buffers", unguarded.length === 0,
      unguarded.join(", "));

// ── [5] the craft download proxy is authed and carries no credential ─────────
console.log("\n[5] craft download proxy");
check("takes a listing id, not a signed URL",
      route.includes('searchParams.get("id")') && !route.includes('searchParams.get("url")'));
// NOT App Check: this route is reached by a top-level navigation (an <a href>,
// so the browser honours Content-Disposition), which cannot carry the
// x-firebase-appcheck header. Requiring it here 403'd every download in
// production while still passing locally, where ENFORCE_APP_CHECK=false. The
// refusal a navigation can satisfy is the session cookie, and entitlement is
// re-decided by the bot behind get_web_user anyway.
check("requires a session, not an unsatisfiable App Check header",
      route.includes("await getSessionToken()") && !route.includes("await guard(req)"));
// One keyed question, not two list scans. The list views signed a URL per row on
// the bot's event loop and the *failing* request paid for both of them, which made
// an id you do not own the cheapest way to spend someone else's Firestore budget.
check("resolves entitlement through the single download endpoint",
      route.includes("botFetch") && route.includes("/download`"));
check("no longer sweeps the two entitlement list views",
      !route.includes("/api/v1/web/marketplace/purchases")
      && !route.includes("/api/v1/web/marketplace/mine")
      && !route.includes("ENTITLED_VIEWS"));
check("still relays the bot's own 401/403 rather than reporting the craft missing",
      /r\.status === 404/.test(route) && /!r\.ok/.test(route));
const mkt = readFileSync("src/lib/marketplace.ts", "utf8");
check("craftDownloadHref puts no url in the query",
      /craftDownloadHref\(listingId: string\)/.test(mkt) && !mkt.includes("url: craftUrl"));

// ── [6] bulk friend decline is reachable from a browser ─────────────────────
//
// The bot has cleared a whole friend inbox in one transaction for a while; the
// browser 404'd, because `[id]/[action]` needs two path segments and this has one.
// A full inbox refuses every NEW request, so filling it is the attack and having
// no way out is the finding.
console.log("\n[6] bulk friend decline");
const declineAll = readFileSync("src/app/api/friends/decline_all/route.ts", "utf8");
check("route exists and proxies the bot's decline_all",
      declineAll.includes('proxy("/api/v1/web/friends/decline_all"'));
const guardAt = declineAll.indexOf("await guard(req)");
const bodyAt = declineAll.indexOf('proxy("/api/v1/web/friends/decline_all"');
check("guard(req) is the handler's first statement, before the bot hop",
      guardAt !== -1 && bodyAt !== -1 && guardAt < bodyAt);
check("posts, never GETs a mutation", /export async function POST\(/.test(declineAll)
      && !/export async function GET\(/.test(declineAll));
const friendsLib = readFileSync("src/lib/friends.ts", "utf8");
check("client calls it through the same-origin BFF",
      friendsLib.includes('authedFetch("/api/friends/decline_all"'));
const friendsCard = readFileSync("src/components/account/friends-card.tsx", "utf8");
check("the account page offers it, behind a confirmation",
      friendsCard.includes("declineAllFriendRequests") && friendsCard.includes("ConfirmDialog"));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
