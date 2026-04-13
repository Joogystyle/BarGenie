import { ChatClient } from "@/components/chat-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";

async function ChatPageContent() {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth?tab=login");
  }

  const claims = data.claims as { sub: string; email?: string };

  return <ChatClient userId={claims.sub} userEmail={claims.email} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh bg-background text-foreground">
          <div className="mx-auto flex min-h-svh w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">Loading bartender...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}