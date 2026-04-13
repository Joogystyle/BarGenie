import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export function SplitScreenHero() {
  return (
    <main className="speakeasy-shell relative">
      <div className="pointer-events-none absolute left-6 top-5 z-20 sm:left-8 lg:left-12">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">BarGenie</p>
      </div>

      <div className="grid min-h-svh lg:grid-cols-2">
        <section className="relative flex items-center justify-center bg-background px-6 py-12 sm:px-8 lg:px-12">
          <div className="halftone-ink pointer-events-none absolute inset-0 opacity-20" />
          <div className="mx-auto max-w-xl text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground/80 sm:text-base">
              Illustrated Speakeasy Noir
            </p>
            <h1 className="mt-3 text-5xl leading-tight text-foreground sm:text-6xl lg:text-7xl">
              Turn Your Shelf Into a Speakeasy.
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Stop guessing what to mix. Tell our AI what&apos;s in your cabinet,
              discover personalized recipes, and learn smart ingredient swaps to
              save money.
            </p>
            <Button asChild className="halftone-ruby mt-8 h-12 px-8 text-base">
              <Link href="/chat">Unlock the bar</Link>
            </Button>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-background px-6 py-8 sm:px-8 lg:px-12">
          <div className="halftone-ink pointer-events-none absolute inset-0 opacity-15" />

          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[18px] border-[3px] border-border bg-card shadow-noir">
            <div className="relative h-[54svh] min-h-[340px] max-h-[600px] w-full">
              <Image
                src="/images/landing-page.png"
                alt="BarGenie landing illustration"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 90vw, 42vw"
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
