/**
 * The two plain-HTML escape hatches for the legal pages, rendered as the very
 * first thing in the document body so a screen reader, a text browser or a
 * Tab press reaches them before the site header, the hero and the rest of the
 * page furniture.
 *
 * They are ordinary `<a href>` links to static files under `public/legal/`,
 * deliberately not `next/link`: the whole point is a document that arrives
 * without the app, so the click must be a real navigation rather than a
 * client-side route change.
 *
 * Visually they follow the skip-link convention — off-screen until focused,
 * then drawn as a normal button in the top-left — so keyboard users get them
 * first without a bar appearing above the header for everyone else.
 */
export function PlainLegalLinks() {
  const cls =
    "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] " +
    "focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 " +
    "focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg " +
    "focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <nav aria-label="Plain text versions">
      <a href="/legal/privacy.html" className={cls}>
        Privacy Policy (plain text, no scripts)
      </a>
      <a href="/legal/terms.html" className={cls}>
        Terms of Service (plain text, no scripts)
      </a>
    </nav>
  );
}
