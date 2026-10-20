import { SiteNav } from "@/components/site-nav";
import { ImportFlow } from "@/components/import-flow";

export const metadata = { title: "Review a paper — ForkTheFuture" };

export default function ImportPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <ImportFlow />
      </main>
    </>
  );
}
