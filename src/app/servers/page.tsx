"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

import { AddServerCard } from "@/components/account/add-server-card";
import { AgentBadge } from "@/components/account/servers-card";
import { ServersGate } from "@/components/servers/servers-gate";
import { fetchServers, type MpServer } from "@/lib/mp-servers";

/**
 * /servers — the account's multiplayer servers. With exactly one, it goes
 * straight into that server's manager (/servers/<id>); `?all=1` (the manager's
 * "Servers" link) stays here, which is also where a new server is added.
 */
export default function ServersPage() {
  return (
    <ServersGate title="Servers">
      <ServerList />
    </ServersGate>
  );
}

function ServerList() {
  const router = useRouter();
  const [servers, setServers] = useState<MpServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchServers();
      setServers(list ?? []);
      const stay = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("all");
      const live = (list ?? []).filter((s) => !s.revoked);
      if (!stay && live.length === 1) router.replace(`/servers/${live[0].server_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your servers.");
      setServers([]);
    }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <AddServerCard onPaired={() => { void load(); }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {servers === null ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : servers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No servers yet. Add one with the command above.
        </p>
      ) : (
        <ul className="space-y-2">
          {servers.map((s) => (
            <li key={s.server_id}>
              <Link href={`/servers/${s.server_id}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {s.server_id}{s.listing?.address ? ` · ${s.listing.address}` : ""}
                  </span>
                </span>
                {s.agent.online && typeof s.agent.players === "number" && (
                  <span className="text-xs text-muted-foreground">{s.agent.players}/{s.agent.max_players ?? "?"} players</span>
                )}
                <AgentBadge s={s} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
