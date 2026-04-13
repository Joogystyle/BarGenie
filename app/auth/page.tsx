import { AuthPage } from "@/components/auth-page";
import { Suspense } from "react";

async function AuthPageContent({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTab =
    resolvedSearchParams?.tab === "sign-up" ? "sign-up" : "login";

  return <AuthPage initialTab={initialTab} />;
}

export default function Page({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<AuthPage initialTab="login" />}>
      <AuthPageContent searchParams={searchParams} />
    </Suspense>
  );
}