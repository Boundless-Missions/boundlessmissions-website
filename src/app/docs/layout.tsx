import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DocsSidebar } from "@/components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="container flex-1">
        <div className="flex gap-10">
          <DocsSidebar />
          <main className="min-w-0 flex-1 py-10 lg:max-w-3xl">{children}</main>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
