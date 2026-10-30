/**
 * PLACEHOLDER / SAMPLE CONTENT ONLY.
 *
 * Everything exported from this file is illustrative dummy data used to preview
 * how job requests and offers look inside the ProLink interface.
 * Every UI surface rendering data from this file MUST display a visible
 * "Example" or "Sample" badge. Do not add platform statistics, ratings,
 * review counts, real people's names, testimonials, or verification claims.
 */

export interface SampleOfferPreview {
  badgeLabel: "Example";
  jobTitle: string;
  category: string;
  pricePkr: string;
  inspectionFeePkr: string;
  arrivalTime: string;
  caption: string;
}

export const heroSampleOffer: SampleOfferPreview = {
  badgeLabel: "Example",
  jobTitle: "Split AC inspection & servicing",
  category: "AC repair and installation",
  pricePkr: "PKR 2,500",
  inspectionFeePkr: "PKR 500",
  arrivalTime: "45–60 mins",
  caption: "Illustrative offer format — quotes vary by job",
};

export interface SampleDispatchPreview {
  badgeLabel: "Example";
  category: string;
  requestSummary: string;
  areaLabel: string;
  priorityTag: string;
}

export interface SampleQuoteComparisonRow {
  optionLabel: string;
  quotePkr: string;
  inspectionPkr: string;
  etaLabel: string;
  highlighted?: boolean;
}

export interface SampleQuoteComparison {
  badgeLabel: "Example";
  rows: SampleQuoteComparisonRow[];
}

export const howItWorksSampleDispatch: SampleDispatchPreview = {
  badgeLabel: "Example",
  category: "Plumbing",
  requestSummary: "Kitchen mixer tap leak",
  areaLabel: "Sector dispatch",
  priorityTag: "Urgent job",
};

export const howItWorksSampleQuotes: SampleQuoteComparison = {
  badgeLabel: "Example",
  rows: [
    {
      optionLabel: "Offer A",
      quotePkr: "PKR 1,800",
      inspectionPkr: "PKR 400",
      etaLabel: " ~35 mins",
      highlighted: true,
    },
    {
      optionLabel: "Offer B",
      quotePkr: "PKR 2,100",
      inspectionPkr: "PKR 500",
      etaLabel: " ~55 mins",
    },
  ],
};

export interface SampleContactHelpline {
  badgeLabel: "Sample";
  phone: string;
  whatsapp: string;
  note: string;
}

export const sampleSupportHelpline: SampleContactHelpline = {
  badgeLabel: "Sample",
  phone: "+92 (42) 111-776-546",
  whatsapp: "+92 (300) 123-4567",
  note: "Demonstration helpline numbers for project inquiries.",
};

