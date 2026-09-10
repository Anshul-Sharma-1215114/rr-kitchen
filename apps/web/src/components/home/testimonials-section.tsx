"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { FeaturedReview } from "@/lib/types";
import { TestimonialCardSkeleton } from "@/components/skeleton";

const TRUST_BADGES = ["100% Home-made", "Hygienically Prepared", "No Preservatives"];

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// Pulls real reviews from the Review model (apps/server/src/controllers/review.controller.ts)
// — structured so it just keeps working as real customers leave reviews.
export function TestimonialsSection() {
  const [reviews, setReviews] = useState<FeaturedReview[] | null>(null);

  useEffect(() => {
    apiFetch<{ reviews: FeaturedReview[] }>("/api/reviews/featured").then((d) => setReviews(d.reviews));
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-center font-display text-xl font-semibold text-charcoal sm:text-2xl">
        What Our Customers Say
      </h2>

      {reviews === null ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TestimonialCardSkeleton key={i} />
          ))}
        </div>
      ) : reviews.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <div key={review.id} className="flex flex-col rounded-2xl border border-spice-100 bg-white p-5 shadow-sm">
              <div className="text-spice-500" aria-hidden="true">
                {"★".repeat(review.rating)}
                <span className="text-charcoal/20">{"★".repeat(5 - review.rating)}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-charcoal/70">&ldquo;{review.comment}&rdquo;</p>
              <p className="mt-3 text-xs font-medium text-charcoal/50">
                {review.customerName.split(" ")[0]} · {timeAgo(review.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {TRUST_BADGES.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-leaf-200 bg-leaf-50 px-4 py-1.5 text-xs font-medium text-leaf-700"
          >
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
