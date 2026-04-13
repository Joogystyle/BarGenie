"use client";

import { createClient } from "@/lib/supabase";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";

export type BottleCategory = "spirit" | "liqueur" | "mixer" | "garnish";

export type Bottle = {
  id: string;
  name: string;
  category: BottleCategory;
  brand: string | null;
  created_at: string;
};

const categoryLabels: Record<BottleCategory, string> = {
  spirit: "Spirit",
  liqueur: "Liqueur",
  mixer: "Mixer",
  garnish: "Garnish",
};

type SupabaseErrorShape = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const dbError = error as SupabaseErrorShape;
    const parts = [dbError.message, dbError.details, dbError.hint].filter(
      (value): value is string => Boolean(value && value.trim()),
    );

    const mergedMessage = parts.join(" ");

    if (
      dbError.code === "42501" ||
      /row-level security|permission denied/i.test(mergedMessage)
    ) {
      return "Database permission denied for this action. Please add an INSERT policy on the bottles table for authenticated users (auth.uid() = user_id).";
    }

    if (
      dbError.code === "23503" ||
      /bottles_user_id_fkey|not present in table "profiles"/i.test(mergedMessage)
    ) {
      return "Your profile row is missing. Please allow profile creation for authenticated users, or run a backfill so profiles.id exists for this account.";
    }

    if (mergedMessage) {
      return mergedMessage;
    }
  }

  return fallback;
}

export function BottlesClient({
  userId,
  userEmail,
  initialBottles,
}: {
  userId: string;
  userEmail?: string;
  initialBottles: Bottle[];
}) {
  const [supabase] = useState(() => createClient());
  const [bottles, setBottles] = useState(initialBottles);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<BottleCategory>("spirit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureProfileExists = async () => {
    const profileNameSource = userEmail?.split("@")[0]?.trim() || "bargenie";
    const safePrefix = profileNameSource
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 24) || "bargenie";
    const safeSuffix = userId.replace(/-/g, "").slice(0, 12);
    const username = `${safePrefix}_${safeSuffix}`;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username,
      },
      {
        onConflict: "id",
        ignoreDuplicates: true,
      },
    );

    if (profileError) {
      throw profileError;
    }
  };

  const addBottle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await ensureProfileExists();

      const { data, error: insertError } = await supabase
        .from("bottles")
        .insert({
          user_id: userId,
          name: trimmedName,
          category,
          brand: brand.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (data) {
        setBottles((current) => [data as Bottle, ...current]);
      }

      setName("");
      setBrand("");
      setCategory("spirit");
    } catch (saveError) {
      setError(toErrorMessage(saveError, "Unable to save bottle."));
    } finally {
      setIsSaving(false);
    }
  };

  const removeBottle = async (bottleId: string) => {
    const snapshot = bottles;
    setError(null);
    setBottles((current) => current.filter((bottle) => bottle.id !== bottleId));

    try {
      const { error: deleteError } = await supabase
        .from("bottles")
        .delete()
        .eq("id", bottleId)
        .eq("user_id", userId);

      if (deleteError) {
        throw deleteError;
      }
    } catch (deleteError) {
      setBottles(snapshot);
      setError(toErrorMessage(deleteError, "Unable to delete bottle."));
    }
  };

  return (
    <main className="speakeasy-shell">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel flex flex-col gap-3 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-primary">
              BarGenie
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-none text-foreground">Bottle cabinet</h1>
            <p className="text-sm text-muted-foreground">
              {bottles.length} bottle{bottles.length === 1 ? "" : "s"} tracked
              {userEmail ? ` · ${userEmail}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/profile">Flavor profile</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/chat">Back to chat</Link>
            </Button>
            <LogoutButton />
          </div>
        </header>

        <section className="grid flex-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="glass-panel text-foreground">
            <CardHeader>
              <CardTitle className="font-heading text-4xl font-semibold leading-none text-foreground">Add a bottle</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Keep your shelf current so future cocktail suggestions stay realistic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={addBottle}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="London dry gin"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as BottleCategory)}
                    className="flex h-11 w-full rounded-[10px] border-[3px] border-input bg-popover px-3 py-2 text-sm font-semibold uppercase tracking-[0.04em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="spirit">Spirit</option>
                    <option value="liqueur">Liqueur</option>
                    <option value="mixer">Mixer</option>
                    <option value="garnish">Garnish</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    placeholder="Optional brand name"
                    className="h-11"
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" disabled={isSaving} className="halftone-ruby w-full">
                  {isSaving ? "Saving..." : "Add bottle"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-panel text-foreground">
            <CardHeader>
              <CardTitle className="font-heading text-4xl font-semibold leading-none text-foreground">Your bottles</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Remove what you do not have or keep the shelf tidy after restocks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bottles.length === 0 ? (
                <div className="rounded-2xl border-[2px] border-dashed border-border/40 bg-popover p-8 text-center text-sm text-muted-foreground">
                  No bottles yet. Add the first item from your cabinet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bottles.map((bottle) => (
                    <div
                      key={bottle.id}
                      className="flex flex-col gap-3 rounded-2xl border-[2px] border-border bg-popover p-4 shadow-noir-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{bottle.name}</h3>
                          <Badge variant="secondary">
                            {categoryLabels[bottle.category]}
                          </Badge>
                        </div>
                        {bottle.brand ? (
                          <p className="text-sm text-muted-foreground">{bottle.brand}</p>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-fit self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => void removeBottle(bottle.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}