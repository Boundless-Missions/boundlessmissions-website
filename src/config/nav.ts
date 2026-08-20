export const siteConfig = {
  name: "Boundless Missions",
  shortName: "Boundless Missions",
  tagline: "Community missions for Kerbal Space Program, run from Discord and flown in game.",
  description:
    "A Discord bot and a Kerbal Space Program add-on that let players hire each other. Write a contract, fly it, hand the craft over, collect the reward. Contracts, auctions, a craft marketplace and weekly missions, reachable from Discord, from the game and from this site.",
  // Community links shown in the site header. Replace with the real URLs.
  links: {
    patreon: "https://patreon.com/ksprehber?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink",
    youtube: "https://www.youtube.com/@aydprj",
    github: "https://github.com/",
  },
};

export interface NavItem {
  title: string;
  href: string;
  /**
   * Session states this item appears in; absent means always.
   *
   * The site is promotional material before you sign in and a tool afterwards, so
   * the header swaps rather than grows: documentation leads the way in, contracts
   * and the account take over once you are through the door. Docs stay one click
   * away from the landing page and from the footer of every page.
   */
  show?: "signed-in" | "signed-out";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Top navigation shown in the site header. */
export const mainNav: NavItem[] = [
  { title: "Overview", href: "/" },
  { title: "Marketplace", href: "/marketplace" },
  { title: "Contracts", href: "/contracts", show: "signed-in" },
  { title: "Auctions", href: "/auctions", show: "signed-in" },
  { title: "Account", href: "/account", show: "signed-in" },
  { title: "Documentation", href: "/docs", show: "signed-out" },
];

/**
 * The navigation for a session state. `null` means not yet known: the server
 * render and the first paint, since the hint cookie is only readable once JS runs.
 * It is treated as signed out, because the anonymous nav is both what a first-time
 * visitor should see and what the prerendered HTML must contain for crawlers.
 */
export function visibleNav(signedIn: boolean | null): NavItem[] {
  const state = signedIn ? "signed-in" : "signed-out";
  return mainNav.filter((item) => !item.show || item.show === state);
}

/**
 * Grouped sidebar for the documentation area.
 *
 * Paths are kept as they were even where a page was retitled, so links shared
 * in Discord over the past year still land somewhere sensible.
 */
export const docsNav: NavSection[] = [
  {
    title: "Start Here",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "What It Does", href: "/docs/what-does-it-do" },
      { title: "Linking Your Game", href: "/docs/how-to-use-it/linking" },
    ],
  },
  {
    title: "Playing",
    items: [
      { title: "Contracts", href: "/docs/how-to-use-it/contracts" },
      { title: "Auctions", href: "/docs/how-to-use-it/auctions" },
      { title: "Rescue Missions", href: "/docs/how-to-use-it/rescues" },
      { title: "Weekly Missions", href: "/docs/how-to-use-it/weekly-missions" },
      { title: "Craft Marketplace", href: "/docs/how-to-use-it/marketplace" },
      { title: "Economy & Ranks", href: "/docs/how-to-use-it/economy" },
      { title: "Bot Commands", href: "/docs/how-to-use-it/commands" },
    ],
  },
  {
    title: "In the Game",
    items: [
      { title: "The Sidebar", href: "/docs/how-to-use-it/features" },
      { title: "Sharing Craft", href: "/docs/how-to-use-it/craft-sharing" },
      { title: "Life Support", href: "/docs/how-to-use-it/life-support" },
      { title: "Mod Settings File", href: "/docs/how-does-it-work/ksp-mod/settings" },
      { title: "Browser Interface", href: "/docs/how-does-it-work/ksp-mod/browser-ui" },
    ],
  },
  {
    title: "Under the Hood",
    items: [
      { title: "Architecture", href: "/docs/how-does-it-work/architecture" },
      { title: "AI Integration", href: "/docs/how-does-it-work/ai" },
      { title: "Privacy & Your Data", href: "/docs/how-does-it-work/privacy" },
      { title: "Bot Setup & Config", href: "/docs/how-does-it-work/discord-bot" },
      { title: "Mod Build & Setup", href: "/docs/how-does-it-work/ksp-mod" },
      { title: "REST API", href: "/docs/how-does-it-work/api" },
    ],
  },
];
