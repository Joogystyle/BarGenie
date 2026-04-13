"use client";

import { Button } from "@/components/ui/button";
import { FlavorPreferencesClient, type FlavorTag } from "@/components/flavor-preferences-client";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SavedRecipeSummary = {
  recipe_id: string;
  saved_at: string | null;
  recipe: {
    id: string;
    title: string;
    picture_url: string | null;
  } | null;
};

type ProfileAccountPreferencesClientProps = {
  userId: string;
  userEmail?: string;
  username: string;
  memberSinceLabel: string;
  profileImageUrl: string | null;
  initialFlavorTags: FlavorTag[];
  initialSelectedTagIds: string[];
  initialSavedRecipes: SavedRecipeSummary[];
};

export function ProfileAccountPreferencesClient({
  userId,
  userEmail,
  username,
  memberSinceLabel,
  profileImageUrl,
  initialFlavorTags,
  initialSelectedTagIds,
  initialSavedRecipes,
}: ProfileAccountPreferencesClientProps) {
  const [supabase] = useState(() => createClient());
  const [savedRecipes, setSavedRecipes] = useState(
    initialSavedRecipes.filter((entry) => entry.recipe !== null),
  );
  const [removingRecipeId, setRemovingRecipeId] = useState<string | null>(null);
  const router = useRouter();

  const remainingSavedRecipes = useMemo(
    () => savedRecipes.filter((entry) => entry.recipe !== null),
    [savedRecipes],
  );

  const removeSavedRecipe = async (recipeId: string) => {
    if (removingRecipeId) {
      return;
    }

    setRemovingRecipeId(recipeId);

    try {
      const { error } = await supabase
        .from("saved_recipes")
        .delete()
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);

      if (error) {
        throw error;
      }

      setSavedRecipes((current) => current.filter((entry) => entry.recipe_id !== recipeId));
    } finally {
      setRemovingRecipeId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <header className="glass-panel flex flex-col gap-3 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-none text-foreground">Flavor Preferences</h1>
            <p className="text-base text-muted-foreground">| Select flavor tags to tailor recommendations.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/chat">Back to chat</Link>
          </Button>
          <LogoutButton />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
        <div className="space-y-6">
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Account</p>
              <Button asChild variant="outline" size="icon" aria-label="Edit profile details" className="h-9 w-9 shrink-0">
                <Link href="/profile/manage">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div>
              <div className="mt-0 flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2px] border-border bg-popover">
                  {profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profileImageUrl} alt={`${username} profile`} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-heading text-2xl font-semibold leading-none text-foreground">{username}, Your usual?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{userEmail ?? "No email available."}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-foreground/80">Member since {memberSinceLabel}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-6">
            <FlavorPreferencesClient
              userId={userId}
              userEmail={userEmail}
              initialFlavorTags={initialFlavorTags}
              initialSelectedTagIds={initialSelectedTagIds}
              embedded
            />
          </section>
        </div>

        <aside className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-4xl font-semibold leading-none text-foreground">Your Cellar</h2>
              <p className="mt-2 text-sm text-muted-foreground">Recipes you&apos;ve kept behind the bar.</p>
            </div>
          </div>

          <div className="mt-5">
            {remainingSavedRecipes.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
                {remainingSavedRecipes.map(({ recipe, recipe_id }) => {
                  if (!recipe) {
                    return null;
                  }

                  return (
                    <article
                      key={recipe_id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/recipes/${recipe.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/recipes/${recipe.id}`);
                        }
                      }}
                      className={cn(
                        "group cursor-pointer border-[2px] border-border bg-popover shadow-noir-sm transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                      )}
                    >
                      <div className="relative aspect-square border-b-[2px] border-border">
                        {recipe.picture_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={recipe.picture_url} alt={recipe.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                            <span className="font-heading text-4xl">?</span>
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 rounded-none bg-background/90"
                          aria-label={`Remove ${recipe.title} from saved recipes`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeSavedRecipe(recipe_id);
                          }}
                          disabled={removingRecipeId === recipe_id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="px-3 py-2">
                        <h3 className="line-clamp-2 text-center font-heading text-xl font-semibold leading-tight text-foreground">{recipe.title}</h3>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="border-[2px] border-border bg-popover px-4 py-5 shadow-noir-sm">
                <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                  Your cellar is empty, friend.
                  {"\n"}
                  Start a conversation and find something worth keeping.
                </p>

                <div className="mt-4">
                  <Button asChild className="rounded-none">
                    <Link href="/chat">Start Chatting</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
