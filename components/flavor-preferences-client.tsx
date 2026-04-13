"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Check, Save, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

type FlavorCategory = "core" | "vibe" | "tasting_note";

export type FlavorTag = {
  id: string;
  name: string;
  category: FlavorCategory;
  description: string | null;
  example_cocktails: string[] | null;
};

type ToastType = "success" | "error";

type ToastState = {
  type: ToastType;
  message: string;
};

const categoryMeta: Record<FlavorCategory, { title: string; hint: string }> = {
  core: {
    title: "Core Flavors",
    hint: "Choose the base profiles you crave most often.",
  },
  vibe: {
    title: "Your Vibe",
    hint: "Set the mood and style you want in your glass.",
  },
  tasting_note: {
    title: "Tasting Notes",
    hint: "Pick nuanced notes you love spotting in cocktails.",
  },
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const dbMessage = (error as { message?: string }).message;
    if (typeof dbMessage === "string" && dbMessage.trim()) {
      return dbMessage;
    }
  }

  return fallback;
}

export function FlavorPreferencesClient({
  userId,
  userEmail,
  initialFlavorTags,
  initialSelectedTagIds,
  embedded = false,
}: {
  userId: string;
  userEmail?: string;
  initialFlavorTags: FlavorTag[];
  initialSelectedTagIds: string[];
  embedded?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSelectedTagIds);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<FlavorCategory | null>(null);
  const [draftSelectedTagIds, setDraftSelectedTagIds] = useState<string[]>(initialSelectedTagIds);

  const tagsByCategory = useMemo(
    () => ({
      core: initialFlavorTags.filter((tag) => tag.category === "core"),
      vibe: initialFlavorTags.filter((tag) => tag.category === "vibe"),
      tasting_note: initialFlavorTags.filter((tag) => tag.category === "tasting_note"),
    }),
    [initialFlavorTags],
  );

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);

  const selectedTagsByCategory = useMemo(
    () => ({
      core: tagsByCategory.core.filter((tag) => selectedSet.has(tag.id)),
      vibe: tagsByCategory.vibe.filter((tag) => selectedSet.has(tag.id)),
      tasting_note: tagsByCategory.tasting_note.filter((tag) => selectedSet.has(tag.id)),
    }),
    [selectedSet, tagsByCategory],
  );

  const triggerToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    globalThis.setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  const ensureProfileExists = async () => {
    const profileNameSource = userEmail?.split("@")[0]?.trim() || "bargenie";
    const safePrefix =
      profileNameSource.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 24) || "bargenie";
    const safeSuffix = userId.replace(/-/g, "").slice(0, 12);
    const username = `${safePrefix}_${safeSuffix}`;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        username,
      },
      {
        onConflict: "id",
        ignoreDuplicates: true,
      },
    );

    if (profileError) {
      throw profileError;
    }
  };

  const savePreferences = async (tagIds: string[] = selectedTagIds) => {
    if (isSaving) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      await ensureProfileExists();

      const { error: deleteError } = await supabase.from("user_flavor_preferences").delete().eq("user_id", userId);

      if (deleteError) {
        throw deleteError;
      }

      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_flavor_preferences")
          .insert(tagIds.map((tagId) => ({ user_id: userId, flavor_tag_id: tagId })));

        if (insertError) {
          throw insertError;
        }
      }

      triggerToast("success", "Flavor preferences saved.");
    } catch (error) {
      const message = toErrorMessage(error, "Unable to save preferences right now.");
      setSaveError(message);
      triggerToast("error", message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCategoryEditor = (category: FlavorCategory) => {
    setDraftSelectedTagIds(selectedTagIds);
    setOpenCategory(category);
  };

  const closeCategoryEditor = () => {
    setOpenCategory(null);
    setDraftSelectedTagIds(selectedTagIds);
  };

  const toggleDraftTag = (tagId: string) => {
    setDraftSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((id) => id !== tagId);
      }

      return [...current, tagId];
    });
  };

  const saveCategoryChanges = async () => {
    const nextTagIds = draftSelectedTagIds;
    setSelectedTagIds(nextTagIds);
    await savePreferences(nextTagIds);
    setOpenCategory(null);
  };

  const summaryCards = (
    <div className="grid grid-cols-1 gap-3">
      {(Object.keys(categoryMeta) as FlavorCategory[]).map((category) => {
        const selectedTags = selectedTagsByCategory[category];

        return (
          <div key={`summary-${category}`} className="border-[2px] border-border/50 bg-popover px-3 py-2 shadow-noir-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{categoryMeta[category].title}:</p>
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag) => (
                      <Badge
                        key={`summary-${category}-${tag.id}`}
                        variant="default"
                        className="halftone-ruby rounded-full border-[2px] border-border text-primary-foreground shadow-noir-sm"
                      >
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">No tags selected.</p>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-none"
                onClick={() => openCategoryEditor(category)}
                aria-label={`Edit ${categoryMeta[category].title}`}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const editor = openCategory ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-3xl font-semibold leading-none text-foreground">Edit {categoryMeta[openCategory].title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Choose tags, then save changes.</p>
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-none" onClick={closeCategoryEditor} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-3 sm:grid-cols-2",
            openCategory === "core" ? "" : "max-h-[45svh] overflow-y-auto pb-2 pr-2",
          )}
        >
          {tagsByCategory[openCategory].map((tag) => {
            const isSelected = draftSelectedTagIds.includes(tag.id);

            return (
              <button
                key={`modal-${openCategory}-${tag.id}`}
                type="button"
                onClick={() => toggleDraftTag(tag.id)}
                aria-pressed={isSelected}
                className={cn(
                  "rounded-[10px] border-[2px] border-border px-3 py-2 text-left transition-all",
                  isSelected
                    ? "translate-x-[2px] translate-y-[2px] bg-primary text-primary-foreground shadow-noir-pressed"
                    : "bg-card text-foreground shadow-noir-sm hover:-translate-y-0.5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.04em]">{tag.name}</span>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </div>
                <p className={cn("mt-1 line-clamp-1 text-xs", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                  {tag.description ?? "No description available."}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-none" onClick={closeCategoryEditor}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void saveCategoryChanges()} disabled={isSaving} className="halftone-ruby rounded-none">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const saveButton = (
    <Button type="button" onClick={() => void savePreferences()} disabled={isSaving} className="halftone-ruby rounded-none">
      <Save className="h-4 w-4" />
      {isSaving ? "Saving..." : "Save Preferences"}
    </Button>
  );

  const saveErrorMessage = saveError ? <p className="text-sm text-destructive">{saveError}</p> : null;

  if (embedded) {
    return (
      <section className="space-y-4">
        <div>
          <h3 className="font-heading text-3xl font-semibold leading-none text-foreground">Your Selected Flavor Tags</h3>
          <p className="mt-2 text-sm text-muted-foreground">Edit each section from the icon on the right.</p>
        </div>
        {summaryCards}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {saveErrorMessage}
          <div className="ml-auto flex flex-wrap items-center gap-2">{saveButton}</div>
        </div>
        {editor}
        {toast ? (
          <div className="pointer-events-none fixed bottom-6 right-6 z-50">
            <div
              className={cn(
                "rounded-xl border-[2px] px-4 py-3 text-sm shadow-noir transition-all duration-300",
                toast.type === "success" ? "border-border bg-card text-foreground" : "border-border bg-destructive text-destructive-foreground",
              )}
            >
              {toast.message}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <main className="speakeasy-shell overflow-hidden">
      <div className="mx-auto flex h-svh w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.26em] text-primary">BarGenie</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <h1 className="font-heading text-4xl font-semibold leading-none text-foreground">Flavor Preferences</h1>
              <p className="text-sm text-muted-foreground">| Select flavor tags to tailor recommendations.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveButton}
            <Button asChild variant="outline" className="rounded-none">
              <Link href="/chat">Back to chat</Link>
            </Button>
            <LogoutButton />
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[1fr_40%]">
          <section className="hidden xl:block" aria-hidden="true" />

          <section className="glass-panel rounded-2xl px-4 py-4">
            <h2 className="font-heading text-3xl font-semibold leading-none text-foreground">Your Selected Flavor Tags</h2>
            <p className="mt-2 text-sm text-muted-foreground">Edit each section from the icon on the right.</p>
            <div className="mt-4">{summaryCards}</div>

            {saveErrorMessage}
          </section>
        </div>
      </div>

      {editor}

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <div
            className={cn(
              "rounded-xl border-[2px] px-4 py-3 text-sm shadow-noir transition-all duration-300",
              toast.type === "success" ? "border-border bg-card text-foreground" : "border-border bg-destructive text-destructive-foreground",
            )}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </main>
  );
}
