import { ProfileManagementClient } from "@/components/profile-management-client";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

async function ProfileManagePageContent() {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth?tab=login");
  }

  const claims = data.claims as { sub: string; email?: string };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  const fallbackUsername = claims.email?.split("@")[0] ?? "Bar guest";
  const profileImageUrl = profile?.avatar_url ?? null;

  return (
    <ProfileManagementClient
      userId={claims.sub}
      initialUsername={profile?.username ?? fallbackUsername}
      initialEmail={claims.email ?? ""}
      initialProfileImageUrl={profileImageUrl}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-background text-foreground">
          <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading profile settings...</p>
          </div>
        </div>
      }
    >
      <ProfileManagePageContent />
    </Suspense>
  );
}
