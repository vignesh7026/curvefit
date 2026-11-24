import type { ReviewView } from "@/lib/api";

const FIT_LABEL = {
  runs_small: "Runs small",
  true_to_size: "True to size",
  runs_large: "Runs large",
} as const;

/** Shows body tags (size, height, hip) so shoppers can find people like them. */
export function ReviewCard({ review }: { review: ReviewView }) {
  return (
    <article className="rounded-sm border border-line bg-card p-4">
      <p aria-label={`${review.rating} out of 5 stars`} className="text-brand">
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)}
      </p>
      <p className="mt-1 text-xs text-muted">
        Wears {review.sizeWorn} · {review.heightCm} cm tall · hip {review.hipCm} cm ·{" "}
        {FIT_LABEL[review.fit]}
        {review.verifiedPurchase ? " · Verified purchase" : ""}
      </p>
      {review.body ? <p className="mt-2 text-sm">{review.body}</p> : null}
      {review.photoUrls && review.photoUrls.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.photoUrls.map((url, i) => (
            <li key={url}>
              {/* Reviewer photos come from our own upload storage, so a plain img is fine. */}
              <img
                src={url}
                alt={`Reviewer photo ${i + 1}`}
                width={96}
                height={96}
                loading="lazy"
                className="size-24 rounded-sm object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
