import { BottlesClient, type Bottle } from "@/components/bottles-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";

async function BottlesPageContent() {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth?tab=login");
  }

  const claims = data.claims as { sub: string; email?: string };
  const { data: bottles } = await supabase
    .from("bottles")
    .select("*")
    .eq("user_id", claims.sub)
    .order("created_at", { ascending: false });

  return (
    <BottlesClient
      userId={claims.sub}
      userEmail={claims.email}
      initialBottles={(bottles ?? []) as Bottle[]}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-background text-foreground">
          <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading bottles...</p>
          </div>
        </div>
      }
    >
      <BottlesPageContent />
    </Suspense>
  );
}