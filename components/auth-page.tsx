"use client";

import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type AuthTab = "login" | "sign-up";

function tabLabel(tab: AuthTab) {
  return tab === "login" ? "Log in" : "Sign up";
}

export function AuthPage({ initialTab }: { initialTab: AuthTab }) {
  const [tab, setTab] = useState<AuthTab>(initialTab);

  return (
    <main className="speakeasy-shell relative overflow-hidden">
      <div className="grid min-h-svh lg:grid-cols-2">
        <section className="relative flex items-center justify-center bg-background px-6 py-8 sm:px-8 lg:px-12">
          <div className="halftone-ink pointer-events-none absolute inset-0 opacity-15" />

          <div className="relative z-10 w-full max-w-4xl p-4 bg-card border-[3px] border-border shadow-noir" style={{ height: '75svh', minHeight: '480px', maxHeight: '900px' }}>
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* Left image */}
              <div className="relative overflow-hidden border-[3px] border-border bg-card shadow-noir">
                <Image
                  src="/images/left.jpg"
                  alt="Noir cocktail gallery - left"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 45vw, 25vw"
                />
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-3 h-full">
                {/* Top right image */}
                <div className="relative overflow-hidden border-[3px] border-border bg-card shadow-noir flex-1">
                  <Image
                    src="/images/right-top.jpg"
                    alt="Noir cocktail gallery - top right"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 45vw, 25vw"
                  />
                </div>

                {/* Bottom right image */}
                <div className="relative overflow-hidden border-[3px] border-border bg-card shadow-noir flex-1">
                  <Image
                    src="/images/right-bottom.jpg"
                    alt="Noir cocktail gallery - bottom right"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 45vw, 25vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center bg-background px-6 py-6 sm:px-8 lg:px-12">
          <div className="halftone-ink pointer-events-none absolute inset-0 opacity-15" />

          <div className="relative z-10 mx-auto w-full max-w-lg">
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="space-y-3 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                    BarGenie
                  </p>
                  <CardTitle className="mt-2 font-heading text-3xl leading-none text-foreground sm:text-4xl">
                    Back To The Bar
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                    Log in or create an account to continue your speakeasy session.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["login", "sign-up"] as AuthTab[]).map((candidate) => (
                    <Button
                      key={candidate}
                      type="button"
                      variant={tab === candidate ? "default" : "outline"}
                      className={cn(
                        "h-10 rounded-none text-xs",
                        tab === candidate
                          ? ""
                          : "bg-card text-foreground",
                      )}
                      onClick={() => setTab(candidate)}
                    >
                      {tabLabel(candidate)}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-0 pb-5">
                {tab === "login" ? <LoginForm /> : <SignUpForm />}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}