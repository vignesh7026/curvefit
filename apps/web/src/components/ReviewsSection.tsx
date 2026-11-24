"use client";

import { useCallback, useEffect, useState } from "react";
import { type ReviewView, getReviews, submitReview } from "@/lib/api";
import { track } from "@/lib/analytics";
import { FIT_EVENT, type FitProfile, getFitProfile } from "@/lib/storage";
import { uploadReviewPhoto } from "@/lib/api-extra";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { ReviewCard } from "./ui/ReviewCard";

interface Props {
  productId: string;
  sizes: string[];
  initial: ReviewView[];
}

export function ReviewsSection({ productId, sizes, initial }: Props) {
  const [reviews, setReviews] = useState(initial);
  const [size, setSize] = useState("");
  const [similar, setSimilar] = useState(false);
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(getFitProfile());
    sync();
    window.addEventListener(FIT_EVENT, sync);
    return () => window.removeEventListener(FIT_EVENT, sync);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(
        await getReviews(productId, {
          size: size || undefined,
          heightCm: similar ? profile?.heightCm : undefined,
          hipCm: similar ? profile?.hipCm : undefined,
        }),
      );
    } catch {
      /* keep what is on screen */
    } finally {
      setLoading(false);
    }
  }, [productId, size, similar, profile]);

  // Skip the first run: the server already rendered the unfiltered list.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) void load();
  }, [touched, load]);

  return (
    <section aria-labelledby="reviews" className="flex flex-col gap-4">
      <h2 id="reviews" className="text-xl font-semibold">
        Fit reviews
      </h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-size" className="text-sm font-medium">
            Size worn
          </label>
          <select
            id="filter-size"
            value={size}
            onChange={(e) => {
              setTouched(true);
              setSize(e.target.value);
            }}
            className="min-h-11 rounded-sm border border-line bg-card px-3"
          >
            <option value="">All sizes</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={similar}
            disabled={!profile}
            onChange={(e) => {
              setTouched(true);
              setSimilar(e.target.checked);
            }}
            className="size-5"
          />
          <span>
            People like me
            {profile ? "" : " (use the size finder first)"}
          </span>
        </label>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews match yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        )}
      </div>

      <ReviewForm productId={productId} sizes={sizes} profile={profile} />
    </section>
  );
}

function ReviewForm({
  productId,
  sizes,
  profile,
}: {
  productId: string;
  sizes: string[];
  profile: FitProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - photos.length);
    e.target.value = "";
    setPhotoError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        if (file.size > 3 * 1024 * 1024) {
          setPhotoError(`${file.name} is larger than 3 MB.`);
          continue;
        }
        urls.push(await uploadReviewPhoto(file));
      }
      setPhotos((p) => [...p, ...urls].slice(0, 4));
    } catch {
      setPhotoError("A photo could not be uploaded. Use a JPEG, PNG or WebP under 3 MB.");
    } finally {
      setUploading(false);
    }
  }
  const [f, setF] = useState({
    rating: "5",
    sizeWorn: sizes[0] ?? "",
    heightCm: "",
    hipCm: "",
    fit: "true_to_size",
    body: "",
  });

  useEffect(() => {
    if (profile) {
      setF((v) => ({
        ...v,
        heightCm: v.heightCm || String(profile.heightCm),
        hipCm: v.hipCm || String(profile.hipCm),
      }));
    }
  }, [profile]);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      await submitReview({
        productId,
        rating: Number(f.rating),
        sizeWorn: f.sizeWorn,
        heightCm: Number(f.heightCm),
        hipCm: Number(f.hipCm),
        fit: f.fit,
        body: f.body,
        photoUrls: photos,
      });
      track("review_submitted", { product: productId });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-sm border border-line bg-card p-4 text-sm">
        Thank you. Your review will appear once we have checked it.
      </p>
    );
  }
  if (!open) {
    return (
      <Button variant="secondary" className="w-fit" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  }

  const selectClass = "min-h-11 rounded-sm border border-line bg-card px-3";
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-sm border border-line bg-card p-4"
    >
      <h3 className="font-semibold">Write a review</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rv-rating" className="text-sm font-medium">
            Rating
          </label>
          <select id="rv-rating" className={selectClass} value={f.rating} onChange={set("rating")}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rv-size" className="text-sm font-medium">
            Size worn
          </label>
          <select
            id="rv-size"
            className={selectClass}
            value={f.sizeWorn}
            onChange={set("sizeWorn")}
          >
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <Input
          id="rv-height"
          label="Height (cm)"
          type="number"
          required
          value={f.heightCm}
          onChange={set("heightCm")}
        />
        <Input
          id="rv-hip"
          label="Hip (cm)"
          type="number"
          required
          value={f.hipCm}
          onChange={set("hipCm")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rv-fit" className="text-sm font-medium">
          How did it fit?
        </label>
        <select id="rv-fit" className={selectClass} value={f.fit} onChange={set("fit")}>
          <option value="runs_small">Runs small</option>
          <option value="true_to_size">True to size</option>
          <option value="runs_large">Runs large</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rv-body" className="text-sm font-medium">
          Your review (optional)
        </label>
        <textarea
          id="rv-body"
          rows={3}
          maxLength={2000}
          value={f.body}
          onChange={set("body")}
          className="rounded-sm border border-line bg-card px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="rv-photos" className="text-sm font-medium">
          Photos (optional, up to 4, JPEG, PNG or WebP, 3 MB each)
        </label>
        <input
          id="rv-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={photos.length >= 4 || uploading}
          onChange={onPickPhotos}
          className="text-sm"
        />
        <div role="status" aria-live="polite" className="text-sm">
          {uploading ? "Uploading…" : null}
          {photoError ? <span className="text-red-700">{photoError}</span> : null}
        </div>
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {photos.map((url, i) => (
              <li key={url} className="relative">
                <img
                  src={url}
                  alt={`Your photo ${i + 1}`}
                  width={72}
                  height={72}
                  className="size-18 rounded-sm object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                  className="absolute -right-2 -top-2 size-6 rounded-full bg-ink text-xs text-paper"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button type="submit" disabled={state === "busy" || uploading}>
        {state === "busy" ? "Sending…" : "Submit review"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          Something went wrong. Please check the fields and try again.
        </p>
      ) : null}
    </form>
  );
}
