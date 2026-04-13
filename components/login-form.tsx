"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/chat");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <form onSubmit={handleLogin}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-[0.14em] text-foreground/80">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.14em] text-foreground/80">
                Password
              </Label>
              <Link
                href="/auth/forgot-password"
                className="ml-auto inline-block text-xs font-semibold uppercase tracking-[0.1em] text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-none" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </div>
        <div className="mt-3 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth?tab=sign-up" className="font-semibold text-primary underline-offset-4 hover:underline">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
