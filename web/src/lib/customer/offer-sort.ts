import type { OfferSortBy, OfferWithProfessional } from "@/lib/customer/types";

// Comparator for sorting offers on a customer's job by price, arrival time (ETA), or rating.
// Kept in a single module so it can later delegate to a server-side MergeSort endpoint without changing the UI.
export function compareOffers(
  a: OfferWithProfessional,
  b: OfferWithProfessional,
  sortBy: OfferSortBy
): number {
  if (sortBy === "price") {
    if (a.price !== b.price) {
      return a.price - b.price;
    }
    return a.eta_minutes - b.eta_minutes;
  }

  if (sortBy === "eta") {
    if (a.eta_minutes !== b.eta_minutes) {
      return a.eta_minutes - b.eta_minutes;
    }
    return a.price - b.price;
  }

  // Sort by rating: rated professionals first in descending order of avg_rating_bayes, then unrated ("New")
  const aHasRating = a.rating_count > 0;
  const bHasRating = b.rating_count > 0;

  if (aHasRating !== bHasRating) {
    return aHasRating ? -1 : 1;
  }

  if (aHasRating && bHasRating && a.avg_rating_bayes !== b.avg_rating_bayes) {
    return b.avg_rating_bayes - a.avg_rating_bayes;
  }

  return a.price - b.price;
}

export function sortOffers(
  offers: readonly OfferWithProfessional[],
  sortBy: OfferSortBy
): OfferWithProfessional[] {
  return [...offers].sort((a, b) => compareOffers(a, b, sortBy));
}
