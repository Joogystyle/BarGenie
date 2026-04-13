import { type FlavorTag } from "@/components/flavor-preferences-client";
import { ProfileAccountPreferencesClient } from "@/components/profile-account-preferences-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";

type SavedRecipeSummary = {
  recipe_id: string;
  saved_at: string | null;
  recipe: {
    id: string;
    title: string;
    picture_url: string | null;
  } | null;
};

function formatMemberSince(createdAt?: string | null) {
  if (!createdAt) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
}

async function ProfilePageContent() {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth?tab=login");
  }

  const claims = data.claims as { sub: string; email?: string };

  const [{ data: userData }, { data: tags }, { data: preferences }, { data: profile }, { data: savedRecipes }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("flavor_tags")
      .select("id, name, category, description, example_cocktails")
      .order("name", { ascending: true }),
    supabase
      .from("user_flavor_preferences")
      .select("flavor_tag_id")
      .eq("user_id", claims.sub),
    supabase.from("profiles").select("username, created_at, avatar_url").eq("id", claims.sub).maybeSingle(),
    supabase
      .from("saved_recipes")
      .select("recipe_id, saved_at, recipe:recipes(id, title, picture_url)")
      .eq("user_id", claims.sub)
      .order("saved_at", { ascending: false }),
  ]);

  const user = userData.user;
  const username = profile?.username ?? claims.email?.split("@")[0] ?? "Bar guest";
  const profileImageUrl = profile?.avatar_url ?? null;
  const memberSinceLabel = formatMemberSince(user?.created_at);
  const normalizedSavedRecipes: SavedRecipeSummary[] = (savedRecipes ?? []).map((entry) => {
    const recipeRecord = Array.isArray(entry.recipe) ? entry.recipe[0] ?? null : entry.recipe ?? null;

    return {
      recipe_id: entry.recipe_id,
      saved_at: entry.saved_at,
      recipe: recipeRecord
        ? {
            id: recipeRecord.id,
            title: recipeRecord.title,
            picture_url: recipeRecord.picture_url,
          }
        : null,
    };
  });

  return (
    <ProfileAccountPreferencesClient
      userId={claims.sub}
      userEmail={user?.email ?? claims.email}
      username={username}
      memberSinceLabel={memberSinceLabel}
      profileImageUrl={profileImageUrl}
      initialFlavorTags={(tags ?? []) as FlavorTag[]}
      initialSelectedTagIds={(preferences ?? []).map((preference) => preference.flavor_tag_id)}
      initialSavedRecipes={normalizedSavedRecipes}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-background text-foreground">
          <div className="mx-auto flex min-h-svh w-full max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading flavor profile...</p>
          </div>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
