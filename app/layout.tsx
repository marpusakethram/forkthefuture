import type { Metadata, Viewport } from "next";
import "@fontsource-variable/figtree";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForkTheFuture — playable research papers",
  description: "Turn a research PDF into an interactive, inspectable experiment. Every parameter shows which page it came from.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
