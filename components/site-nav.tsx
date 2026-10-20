import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="ForkTheFuture home">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <line x1="4" y1="20" x2="11" y2="9" stroke="#0866ff" strokeWidth="3" strokeLinecap="round" />
        <line x1="11" y1="9" x2="20" y2="6" stroke="#6ea8ff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="4" cy="20" r="2.2" fill="currentColor" />
        <circle cx="11" cy="9" r="2" fill="currentColor" />
        <circle cx="20" cy="6" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span className="text-[17px]">forkthefuture</span>
    </Link>
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Logo />
        <div className="flex items-center gap-1 text-sm font-medium text-slate sm:gap-2">
          <a href="#demos" className="hidden rounded-full px-3 py-2 hover:bg-mist hover:text-ink sm:block">Demos</a>
          <a href="#how" className="hidden rounded-full px-3 py-2 hover:bg-mist hover:text-ink sm:block">How it works</a>
          <a href="#limits" className="hidden rounded-full px-3 py-2 hover:bg-mist hover:text-ink md:block">Scientific limits</a>
          <a href="#upload" className="rounded-full bg-ink px-4 py-2 text-white hover:bg-ink/85">Upload a paper</a>
        </div>
      </nav>
    </header>
  );
}
