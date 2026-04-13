"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    if (/row-level security policy|violates row-level security/i.test(error.message)) {
      return "Upload blocked by Supabase Storage RLS policy on bucket \"users\". Please add storage policies for authenticated users to upload into their own folder (auth.uid()).";
    }

    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const dbMessage = (error as { message?: string }).message;
    if (typeof dbMessage === "string" && dbMessage.trim()) {
      if (/row-level security policy|violates row-level security/i.test(dbMessage)) {
        return "Upload blocked by Supabase Storage RLS policy on bucket \"users\". Please add storage policies for authenticated users to upload into their own folder (auth.uid()).";
      }

      return dbMessage;
    }
  }

  return fallback;
}

export function ProfileManagementClient({
  userId,
  initialUsername,
  initialEmail,
  initialProfileImageUrl,
}: {
  userId: string;
  initialUsername: string;
  initialEmail: string;
  initialProfileImageUrl: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);
  const [currentProfileImageUrl, setCurrentProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProfileImageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl || !previewUrl.startsWith("blob:")) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      setPreviewUrl(currentProfileImageUrl);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  };

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail) {
      setErrorMessage("Username and email are required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let nextProfileUrl = currentProfileImageUrl;

      if (selectedFile) {
        const safeFileName = sanitizeFileName(selectedFile.name);
        const filePath = `${userId}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("users")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("users").getPublicUrl(filePath);

        nextProfileUrl = publicUrl;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          username: trimmedUsername,
          avatar_url: nextProfileUrl,
        },
        {
          onConflict: "id",
        },
      );

      if (profileError) {
        throw profileError;
      }

      if (trimmedEmail !== initialEmail) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });

        if (emailError) {
          throw emailError;
        }
      }

      setSelectedFile(null);
      setCurrentProfileImageUrl(nextProfileUrl);
      setPreviewUrl(nextProfileUrl);
      setSuccessMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(toErrorMessage(error, "Unable to update profile right now."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="speakeasy-shell min-h-svh px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="glass-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">BarGenie</p>
            <h1 className="mt-1 font-heading text-4xl font-semibold leading-none text-foreground">Profile Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Edit username, email, and profile image.</p>
          </div>

          <Button asChild variant="outline">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
          </Button>
        </header>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="font-heading text-3xl leading-none text-foreground">Account Details</CardTitle>
            <CardDescription>Changes are saved to your profile immediately after submit.</CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={onSave}>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2px] border-border bg-popover">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor="profileImage">Profile image</Label>
                  <Input id="profileImage" type="file" accept="image/*" onChange={onFileChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your bartender name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
              {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

              <Button type="submit" className="halftone-ruby rounded-none" disabled={isSaving}>
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
