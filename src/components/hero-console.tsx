import {
  Bot,
  Gamepad2,
  ArrowRight,
  Coins,
  CircleCheck,
  Radio,
} from "lucide-react";

/**
 * The hero visual.
 *
 * Deliberately drawn in markup rather than screenshotted: the in-game panels and
 * the Discord embeds both change shape often, and a stale screenshot on the front
 * page is worse than no screenshot at all. What is stable is the shape of the
 * system, so that is what this draws: a contract crossing from Discord, through
 * the signed API, into the game, and payment coming back the other way.
 */

const discordRows = [
  { label: "Contract posted", value: "Rescue: Mun orbit" },
  { label: "Reward escrowed", value: "4,500 KCoins" },
  { label: "Accepted by", value: "@contractor" },
];

const gameRows = [
  { label: "Situation", value: "ORBITING" },
  { label: "Body", value: "Mun" },
  { label: "Crew aboard", value: "3" },
  { label: "Craft delivered", value: "Rescue Tug II" },
];

function PanelHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Bot;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-accent/40 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{title}</p>
        <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-[11px] text-foreground/90">
        {value}
      </span>
    </div>
  );
}

export function HeroConsole() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 glow-grid opacity-70" />

      {/* Title bar */}
      <div className="relative flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-primary" />
          One contract, two places
        </div>
        <div className="hidden items-center gap-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          api/v1
        </div>
      </div>

      <div className="relative grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
        {/* Discord side */}
        <div className="rounded-xl border border-border/80 bg-background/60">
          <PanelHeading
            icon={Bot}
            title="Discord"
            subtitle="Where the deal is struck"
          />
          <div className="divide-y divide-border/50">
            {discordRows.map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border/70 px-4 py-2.5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">
              Payment held until the work lands
            </span>
          </div>
        </div>

        {/* Link */}
        <div
          className="flex items-center justify-center gap-2 md:flex-col"
          aria-hidden="true"
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent via-primary/50 to-transparent md:h-10 md:w-px md:bg-gradient-to-b" />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <ArrowRight className="h-4 w-4 md:rotate-90" />
          </span>
          <span className="h-px w-10 bg-gradient-to-r from-transparent via-primary/50 to-transparent md:h-10 md:w-px md:bg-gradient-to-b" />
        </div>

        {/* Game side */}
        <div className="rounded-xl border border-border/80 bg-background/60">
          <PanelHeading
            icon={Gamepad2}
            title="Kerbal Space Program"
            subtitle="Where the work happens"
          />
          <div className="divide-y divide-border/50">
            {gameRows.map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border/70 px-4 py-2.5">
            <CircleCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">
              Submitted from the game, with the ship as evidence
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
