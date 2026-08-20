import type { Metadata } from "next";

import "./globals.css";
import { AppCheckInit } from "@/components/app-check-init";
import { SpaceBackground } from "@/components/space-background";
import { siteConfig } from "@/config/nav";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · Mission Control`,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Kerbal Space Program",
    "KSP",
    "Discord bot",
    "Boundless Missions",
    "mods",
    "contracts",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppCheckInit />
        <SpaceBackground />
        {children}
      </body>
    </html>
  );
}
