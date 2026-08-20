# ⏰ Reminder: enforce the CSP after go-live

**Why this file exists:** the site's Content-Security-Policy currently ships in
**Report-Only** mode, which *logs* violations but *blocks nothing*. It was left
that way on purpose so the policy could be validated against live reCAPTCHA / App
Check traffic before enforcement, since one wrong origin in an enforced
`connect-src` would 403 every authed route and lock users out. This is the note to
finish that rollout once the live domain has been serving real traffic for a while.

- **File to change:** `next.config.mjs`
- **Current header key:** `Content-Security-Policy-Report-Only`
- **Security finding:** F3 (INFO/MEDIUM) in `../2008_security_audit.md`

---

## Fill this in

- **Production go-live date:** `____________________`
- **Check this reminder on/after:** `____________________`  *(suggest ~2 weeks of real traffic on the production domain — enough for the reCAPTCHA/App Check flows to have exercised every route at least once)*

---

## Step 1 — Confirm the console is clean (do this FIRST)

On the **production** domain, in a normal browser session, exercise every path:
sign in (link + poll), marketplace grid + a listing detail + buy/download, an
auction bid, contracts, the account page, and the admin console if you use it.

Watch DevTools → Console for lines like:

> `[Report Only] Refused to connect to 'https://…' because it violates the
> following Content Security Policy directive: "connect-src …"`

- **No CSP report-only violations across all routes?** → safe to enforce. Go to Step 2.
- **Any violation?** → add that exact origin to the right directive in the `csp`
  array in `next.config.mjs` (usually `connect-src`, sometimes `img-src` /
  `frame-src`), redeploy, and re-check. Do **not** enforce until the console is clean.

## Step 2 — Flip to enforcing

In `next.config.mjs`, in the `securityHeaders` array, rename the key only:

```diff
- { key: "Content-Security-Policy-Report-Only", value: csp },
+ { key: "Content-Security-Policy",             value: csp },
```

Nothing else changes — the policy string stays the same. Deploy.

## Step 3 — Verify enforcement is live

```bash
curl -sI https://<your-production-domain>/ | grep -i content-security-policy
```

Expect the header name to be `content-security-policy` (no `-report-only`
suffix). Then re-run the Step 1 walkthrough and confirm nothing is actually broken
(now the browser will *block*, not just report). If a route breaks, the fastest
safe rollback is renaming the key back to `-Report-Only` and redeploying, then fix
the missing origin.

---

## Optional follow-up (larger change, not required for the baseline win)

Even enforced, `script-src` still carries `'unsafe-inline'` and `'unsafe-eval'`
(needed today for Next.js hydration and reCAPTCHA). Those weaken the XSS
protection the CSP is meant to provide. Tightening them means introducing a
**nonce pipeline** for inline scripts and confirming reCAPTCHA no longer needs
`'unsafe-eval'`. Worth doing eventually, but it's a separate project — enforcing
the policy as-is (Steps 1–3) is the high-value, low-risk step to finish first.

---

## Done?

- [ ] Production console clean of CSP report-only violations (all routes)
- [ ] Header renamed to `Content-Security-Policy` in `next.config.mjs`
- [ ] Deployed; `curl -I` confirms the enforced header
- [ ] Re-walked all routes with no breakage
- [ ] (later) `'unsafe-inline'` / `'unsafe-eval'` tightened via a nonce pipeline

*Once the first four boxes are ticked, F3 is resolved — you can delete this file.*
