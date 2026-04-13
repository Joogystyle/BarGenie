import { RecipeDetailClient } from "@/components/recipe-detail-client";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";

type RecipeIngredient = {
  name: string;
  amount?: string | number | null;
  unit?: string | null;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  instructions: string;
  flavor_tags: string[] | null;
  picture_url: string | null;
  fun_fact: null;
};

async function RecipePageContent({ params }: { params: Promise<{ id: string }> }) {
  noStore();

  const { id: recipeId } = await params;

  if (!recipeId) {
    notFound();
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/auth?tab=login");
  }

  const claims = claimsData.claims as { sub: string; email?: string };
  const [{ data: recipeData, error: recipeError }, { data: savedRecipeData }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, description, ingredients, instructions, flavor_tags, picture_url")
      .eq("id", recipeId)
      .maybeSingle(),
    supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", claims.sub)
      .eq("recipe_id", recipeId)
      .maybeSingle(),
  ]);

  if (recipeError) {
    throw recipeError;
  }

  if (!recipeData) {
    notFound();
  }

  const recipe: Recipe = {
    id: recipeData.id,
    title: recipeData.title,
    description: recipeData.description,
    ingredients: Array.isArray(recipeData.ingredients) ? (recipeData.ingredients as RecipeIngredient[]) : [],
    instructions: recipeData.instructions,
    flavor_tags: Array.isArray(recipeData.flavor_tags) ? (recipeData.flavor_tags as string[]) : [],
    picture_url: recipeData.picture_url,
    fun_fact: null,
  };

  return <RecipeDetailClient userId={claims.sub} recipe={recipe} initialSaved={Boolean(savedRecipeData)} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-background text-foreground">
          <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading recipe...</p>
          </div>
        </div>
      }
    >
      <RecipePageContent params={params} />
    </Suspense>
  );
}
