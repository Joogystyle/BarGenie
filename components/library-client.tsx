"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

type LibraryRecipe = {
  id: string;
  title: string;
  flavor_tags: string[];
  picture_url: string | null;
};

function normalizeFlavorTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function LibrarySkeletonCard() {
  return (
    <div className="overflow-hidden border-[2px] border-[#1A1008] bg-[#E8D5C0] shadow-[4px_4px_0_#1A1008] animate-pulse">
      <div className="aspect-square bg-[#E8D5C0]" />
      <div className="space-y-3 border-t-[2px] border-[#1A1008] bg-[#F2E8DC] px-3 py-3">
        <div className="h-4 w-4/5 bg-[#D8C2A7]" />
        <div className="flex gap-2">
          <div className="h-5 w-12 bg-[#D4614A]" />
          <div className="h-5 w-10 bg-[#D4614A]" />
        </div>
      </div>
    </div>
  );
}

function LibraryCard({ recipe }: { recipe: LibraryRecipe }) {
  const tags = normalizeFlavorTags(recipe.flavor_tags).slice(0, 2);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={cn(
        "group block cursor-pointer overflow-hidden border-[2px] border-[#1A1008] bg-[#F2E8DC] shadow-[4px_4px_0_#1A1008] transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-[6px_6px_0_#1A1008] focus:outline-none focus:ring-2 focus:ring-[#1A1008] focus:ring-offset-2 focus:ring-offset-[#F2E8DC]",
      )}
    >
      {recipe.picture_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.picture_url}
          alt={recipe.title}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-[#E8D5C0]">
          <span className="text-4xl opacity-30">🍸</span>
        </div>
      )}

      <div className="border-t-[2px] border-[#1A1008] px-3 py-3">
        <h2 className="font-heading text-[15px] font-semibold leading-tight text-[#1A1008] sm:text-base">
          {recipe.title}
        </h2>

        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={`${recipe.id}-${tag}`}
                className="rounded-full border-[1px] border-[#1A1008] bg-[#D4614A] px-2 py-0.5 text-xs font-semibold text-[#F2E8DC]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function LibraryClient() {
  const [supabase] = useState(() => createClient());
  const [recipes, setRecipes] = useState<LibraryRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRecipes = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("recipes")
        .select("id, title, flavor_tags, picture_url")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setRecipes([]);
      } else {
        const normalizedRecipes: LibraryRecipe[] = (data ?? []).map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          picture_url: recipe.picture_url,
          flavor_tags: normalizeFlavorTags(recipe.flavor_tags),
        }));

        setRecipes(normalizedRecipes);
      }

      setIsLoading(false);
    };

    void loadRecipes();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <main className="min-h-svh text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel flex flex-col gap-3 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">BarGenie</p>
            <h1 className="font-heading text-4xl font-semibold leading-none text-foreground sm:text-5xl">
              The Library
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Every pour. Every story. All in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/chat">Start Chatting</Link>
            </Button>
          </div>
        </header>

        <section className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <LibrarySkeletonCard key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="glass-panel rounded-2xl px-5 py-6 text-sm text-foreground">
              <p>We could not load the library right now.</p>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="max-w-xl border-[2px] border-[#1A1008] bg-[#F2E8DC] px-6 py-8 text-center shadow-[4px_4px_0_#1A1008]">
                <p className="whitespace-pre-line font-heading text-2xl leading-tight text-[#1A1008] sm:text-3xl">
                  The library&apos;s empty.
                  {"\n"}
                  The bartender hasn&apos;t stocked the shelves yet.
                </p>

                <div className="mt-5">
                  <Button asChild>
                    <Link href="/chat">Start Chatting</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {recipes.map((recipe) => (
                <LibraryCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}