"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RecipeIngredient = {
  name: string;
  amount?: string | number | null;
  unit?: string | null;
};

type RecipeDetailClientProps = {
  userId: string;
  recipe: {
    id: string;
    title: string;
    description: string | null;
    ingredients: RecipeIngredient[];
    instructions: string;
    flavor_tags: string[] | null;
    picture_url: string | null;
    fun_fact?: string | null;
  };
  initialSaved: boolean;
};

function splitInstructions(instructions: string) {
  return instructions
    .split(/\n+|(?<=[.!?])\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

function formatIngredientAmount(amount?: string | number | null, unit?: string | null) {
  const parts = [amount ?? "", unit ?? ""].map((part) => String(part).trim()).filter(Boolean);
  return parts.join(" ");
}

function normalizeIngredients(ingredients: RecipeIngredient[]) {
  return ingredients
    .map((ingredient) => ({
      amount: formatIngredientAmount(ingredient.amount, ingredient.unit),
      name: ingredient.name,
    }))
    .filter((ingredient) => ingredient.name.trim().length > 0);
}

export function RecipeDetailClient({ userId, recipe, initialSaved }: RecipeDetailClientProps) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isSaving, setIsSaving] = useState(false);

  const ingredientRows = normalizeIngredients(recipe.ingredients ?? []);
  const instructionSteps = splitInstructions(recipe.instructions);

  const toggleSaved = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_recipes")
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", recipe.id);

        if (error) {
          throw error;
        }

        setIsSaved(false);
      } else {
        const { error } = await supabase.from("saved_recipes").insert({
          user_id: userId,
          recipe_id: recipe.id,
        });

        if (error) {
          throw error;
        }

        setIsSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="speakeasy-shell min-h-svh">
      <div className="mx-auto flex w-full flex-col gap-4 px-4 py-4 sm:px-6 lg:w-[78%] xl:w-[60%] lg:px-0">
        <header className="glass-panel flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">BarGenie</p>
            <h1 className="font-heading text-4xl font-semibold leading-[1.05] text-foreground">{recipe.title}</h1>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
            <Button type="button" onClick={() => void toggleSaved()} disabled={isSaving} className="whitespace-nowrap rounded-none">
              {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSaved ? "Saved" : "Save to Cellar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap rounded-none"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_3fr]">
          <section className="min-h-0 space-y-4 border-[3px] border-border bg-card p-4 shadow-noir sm:p-5">
            <div className="relative mx-auto aspect-square w-full max-w-[23rem] overflow-hidden border-[3px] border-border bg-card shadow-noir-sm">
              {recipe.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.picture_url}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(26,16,8,0.06),transparent_42%),linear-gradient(135deg,rgba(26,16,8,0.02),rgba(26,16,8,0.08))]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm uppercase tracking-[0.24em] text-[#6f5a47]">[ Image Coming Soon ]</p>
                  </div>
                </>
              )}
            </div>

            <p className="text-sm leading-6 text-foreground/85 sm:text-base">
              {recipe.description?.trim() || "No description has been written for this recipe yet."}
            </p>

            <div>
              <h2 className="font-heading text-lg font-semibold leading-none text-foreground">Story Behind</h2>
              <p className="mt-2 text-sm italic leading-6 text-foreground/85 sm:text-base">
                {recipe.fun_fact?.trim() || "No story recorded yet. This one is still keeping its secrets."}
              </p>
            </div>
          </section>

          <div className="min-h-0 space-y-4">
            <section className="glass-panel space-y-3 rounded-2xl p-4 sm:p-5">
              <h2 className="font-heading text-2xl font-semibold leading-none text-foreground sm:text-3xl">Ingredient</h2>
              {ingredientRows.length > 0 ? (
                <div className="divide-y-2 divide-border overflow-hidden rounded-xl border-[2px] border-border bg-popover">
                  {ingredientRows.map((ingredient, index) => (
                    <div key={`${recipe.id}-ingredient-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <p className="min-w-[96px] shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-primary sm:text-sm">
                        {ingredient.amount || "To taste"}
                      </p>
                      <p className="flex-1 text-right text-sm font-semibold text-foreground sm:text-base">{ingredient.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">The ingredient list is still being documented.</p>
              )}
            </section>

            <section className="glass-panel min-h-0 space-y-3 rounded-2xl p-4 sm:p-5">
              <h2 className="font-heading text-2xl font-semibold leading-none text-foreground sm:text-3xl">How to Make</h2>
              {instructionSteps.length > 0 ? (
                <ol className="space-y-2.5">
                  {instructionSteps.map((step, index) => (
                    <li
                      key={`${recipe.id}-instruction-${index}`}
                      className={cn(
                        "border-[2px] border-border bg-card px-4 py-3 shadow-noir-sm",
                        index % 2 === 0 ? "rotate-1" : "-rotate-1",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-noir-sm">
                          {index + 1}
                        </div>
                        <p className="pt-0.5 text-sm leading-6 text-foreground">{step}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">The instructions are still waiting for their cue.</p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
