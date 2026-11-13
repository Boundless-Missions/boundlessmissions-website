"use client";

import { useParams } from "next/navigation";

import { ServersGate } from "@/components/servers/servers-gate";
import { SECTIONS, ServerManager, type SectionId } from "@/components/servers/server-manager";

/** /servers/<id>/<section> — one server's manager; the section defaults to Server. */
export default function ServerManagerPage() {
  const params = useParams<{ id: string; section?: string[] }>();
  const id = String(params.id ?? "");
  const want = params.section?.[0] ?? "server";
  const section = (SECTIONS.some((s) => s.id === want) ? want : "server") as SectionId;
  return (
    <ServersGate>
      <ServerManager serverId={id} section={section} />
    </ServersGate>
  );
}
