"use client";

export type ReviewListItem = {
  id: string;
  name: string;
  title?: string | null;
  rating?: number | null;
  date?: string | null;
  review: string;
};

type ReviewsListProps = {
  reviews: ReviewListItem[];
};

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-6">
        {reviews.map((review) => (
          <article key={review.id} className="border-b border-[#e6e8eb] pb-6 last:border-b-0 last:pb-0">
            <div className="flex flex-col gap-1 text-[14px] leading-[1.6] text-[#334155]">
              <span className="text-[14px] font-semibold text-[#0a2540]">{review.name}</span>
              {review.title ? <span className="text-[13px] text-[#475569]">{review.title}</span> : null}
              {review.rating != null ? (
                <span className="text-[13px] text-[#475569]">
                  {Number(review.rating).toFixed(1).replace(/\.0$/, "")} / 5
                  {review.date ? ` • ${review.date}` : ""}
                </span>
              ) : review.date ? (
                <span className="text-[13px] text-[#475569]">{review.date}</span>
              ) : null}
            </div>
            <p className="mt-3 text-[14px] leading-[1.6] text-[#334155]">{review.review}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
