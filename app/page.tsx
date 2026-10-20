import { SiteNav, Logo } from "@/components/site-nav";
import { HeroArm } from "@/components/hero-arm";
import { PdfUpload } from "@/components/pdf-upload";
import { DemoCards } from "@/components/demo-cards";
import Link from "next/link";

const STEPS = [
  { title: "Drop in a PDF", body: "PDF.js reads the text in your browser. You pick the pages worth analysing — nothing else leaves your machine." },
  { title: "Check the evidence", body: "Each equation and number is shown next to the sentence and page it came from. You accept, edit or reject every value." },
  { title: "Play with it", body: "Move the sliders and the model recomputes. Pin two runs to compare, then export a PNG, scenario JSON or an offline HTML file." },
];

const NOT = [
  "It doesn't turn any paper into a physically accurate simulator. It maps papers onto three small, tested models.",
  "It never runs code written by an AI. Gemini only reads and quotes; the maths lives in plain TypeScript with unit tests.",
  "It doesn't reproduce a paper's results. Matching one equation is not the same as reproducing a study.",
  "It doesn't invent missing constants. If the paper doesn't state a value, the slider says “illustrative”.",
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
          <div>
            <h1 className="text-[44px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[76px]">
              What if research papers were playable?
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-slate sm:text-xl">
              Drop in a PDF. ForkTheFuture finds the equations, shows you the exact sentence every number came from, and gives you the sliders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#upload" className="inline-flex h-12 items-center rounded-full bg-signal px-6 font-semibold text-white hover:bg-signal-deep">
                Upload a paper
              </a>
              <Link href="/playground/demo-arm" className="inline-flex h-12 items-center rounded-full bg-mist px-6 font-semibold hover:bg-line" data-testid="hero-open-studio">
                Open the arm studio
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate">Supports 2-link arm kinematics, battery capacity fade and M/M/1 queues. Anything else gets an honest “unsupported”.</p>
          </div>
          <HeroArm />
        </section>

        <section id="upload" className="scroll-mt-20 bg-paper">
          <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
            <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">Bring your own paper</h2>
            <p className="mb-6 max-w-2xl text-slate">Have nothing handy? The sample is a two-page kinematics handout we wrote for this demo (CC BY 4.0).</p>
            <PdfUpload />
          </div>
        </section>

        <section id="demos" className="scroll-mt-20 bg-mist py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">Or start with a template</h2>
            <p className="mb-8 max-w-2xl text-slate">Each one is a small, verified model with illustrative values you can change.</p>
            <DemoCards />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl">From PDF to playable in three steps</h2>
            <ol className="grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="tabular flex size-10 shrink-0 items-center justify-center rounded-full bg-signal-soft text-lg font-bold text-signal">{i + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1 leading-relaxed text-slate">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="limits" className="scroll-mt-20 px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[var(--radius-panel)] bg-studio px-6 py-12 text-studio-text sm:px-12">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">What it won&apos;t pretend to do</h2>
            <ul className="mt-8 grid gap-x-12 gap-y-5 md:grid-cols-2">
              {NOT.map((n) => (
                <li key={n} className="border-l-2 border-signal pl-4 leading-relaxed text-studio-text/90">{n}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate sm:px-6">
          <Logo className="text-ink" />
          <p>Models are educational. Read the scientific-validity notes in the repository before citing anything.</p>
        </div>
      </footer>
    </>
  );
}
