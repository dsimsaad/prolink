import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchProfessionalReviews } from "@/lib/pro/queries";
import { formatKarachiDateTime } from "@/lib/customer/format";

export default async function ProfessionalReviewsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pro/reviews");
  }

  const { reviews, ratingCount, avgRating } = await fetchProfessionalReviews(
    user.id
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:flex-row sm:items-center sm:p-6 shadow-2xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Customer Feedback
          </span>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#0C2A1B] sm:text-2xl">
            Reviews &amp; ratings
          </h1>
          <p className="mt-1 text-xs text-[#6A7B70]">
            Real ratings left by customers after confirming job completion.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-4 py-3">
          {ratingCount <= 0 || avgRating === null ? (
            <div className="text-left sm:text-right">
              <span className="inline-flex items-center rounded-md border border-[#DCE8E0] bg-[#E6F4EA] px-2.5 py-0.5 text-xs font-bold text-[#0F6B3E]">
                New
              </span>
              <p className="mt-1 text-[11px] text-[#6A7B70]">
                0 reviews received yet
              </p>
            </div>
          ) : (
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Star
                  className="h-5 w-5 fill-amber-500 text-amber-500"
                  aria-hidden="true"
                />
                <span className="text-xl font-extrabold text-[#0C2A1B]">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-[#6A7B70]">
                  / 5.0
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#6A7B70]">
                Based on {ratingCount}{" "}
                {ratingCount === 1 ? "review" : "reviews"}
              </p>
            </div>
          )}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE8E0] bg-white p-10 text-center shadow-2xs">
          <Star
            className="mx-auto h-8 w-8 text-[#6A7B70]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-bold text-[#0C2A1B]">
            No customer reviews yet (New)
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-[#6A7B70]">
            Until you receive your first customer review, your profile displays
            the &ldquo;New&rdquo; badge rather than a synthetic rating.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <article
              key={rev.id}
              className="rounded-2xl border border-[#DCE8E0] bg-white p-5 shadow-2xs space-y-3"
            >
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= rev.rating
                            ? "fill-amber-500 text-amber-500"
                            : "text-stone-300"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                    <span className="ml-1 text-xs font-bold text-[#0C2A1B]">
                      {rev.rating} / 5
                    </span>
                    <span className="text-xs text-[#6A7B70]">
                      by <strong>{rev.reviewer_name}</strong>
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-[#0C2A1B]">
                    Job:{" "}
                    <Link
                      href={`/pro/jobs/${rev.job_id}`}
                      className="text-[#0F6B3E] hover:underline"
                    >
                      {rev.job_title}
                    </Link>
                  </h2>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#6A7B70]">
                  <span>{formatKarachiDateTime(rev.created_at)}</span>
                  <Link
                    href={`/pro/jobs/${rev.job_id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#0F6B3E] hover:underline"
                  >
                    <span>Open job</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {rev.comment ? (
                <p className="rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-3.5 text-xs leading-relaxed text-[#0C2A1B]">
                  {rev.comment}
                </p>
              ) : (
                <p className="text-xs italic text-[#6A7B70]">
                  Customer did not include a written comment.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
