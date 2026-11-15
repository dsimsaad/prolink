"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Info, Sparkles, X } from "lucide-react";
import {
  createCustomerJob,
  publishCustomerJob,
  suggestJobCategory,
  updateDraftJob,
} from "@/lib/api/customer";
import { formatBudgetRange } from "@/lib/customer/format";
import type { AreaOption, CategoryOption, JobUrgency } from "@/lib/customer/types";
import { WakingServerBanner } from "@/components/customer/customer-dialog";

interface JobFormProps {
  mode: "create" | "edit";
  jobId?: string;
  categories: CategoryOption[];
  areas: AreaOption[];
  defaultAreaId: number | null;
  initialValues?: {
    title: string;
    description: string;
    categoryId: number;
    areaId: number;
    budgetMin: number | null;
    budgetMax: number | null;
    urgency: JobUrgency;
  };
}

export function JobForm({
  mode,
  jobId,
  categories,
  areas,
  defaultAreaId,
  initialValues,
}: JobFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryId, setCategoryId] = useState<number>(
    initialValues?.categoryId ?? (categories[0]?.id ?? 0)
  );
  const [areaId, setAreaId] = useState<number>(
    initialValues?.areaId ?? defaultAreaId ?? (areas[0]?.id ?? 0)
  );
  const [budgetMinRaw, setBudgetMinRaw] = useState(
    initialValues?.budgetMin !== null && initialValues?.budgetMin !== undefined
      ? String(initialValues.budgetMin)
      : ""
  );
  const [budgetMaxRaw, setBudgetMaxRaw] = useState(
    initialValues?.budgetMax !== null && initialValues?.budgetMax !== undefined
      ? String(initialValues.budgetMax)
      : ""
  );
  const [urgency, setUrgency] = useState<JobUrgency>(
    initialValues?.urgency ?? "normal"
  );

  const [suggestedCat, setSuggestedCat] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  const [submittingAction, setSubmittingAction] = useState<"draft" | "publish" | null>(
    null
  );
  const [wakingUp, setWakingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name ?? "Not selected",
    [categories, categoryId]
  );

  const selectedAreaName = useMemo(
    () => areas.find((a) => a.id === areaId)?.name ?? "Not selected",
    [areas, areaId]
  );

  const combinedText = `${title.trim()} ${description.trim()}`.trim();

  // Optional category suggestion from /jobs/suggest-category after user types description
  useEffect(() => {
    if (dismissedSuggestion || combinedText.length < 25) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void suggestJobCategory(combinedText).then((res) => {
        if (!active) return;
        if (
          res.suggestedCategoryId &&
          res.suggestedCategoryName &&
          res.suggestedCategoryId !== categoryId
        ) {
          setSuggestedCat({
            id: res.suggestedCategoryId,
            name: res.suggestedCategoryName,
          });
        } else {
          setSuggestedCat(null);
        }
      });
    }, 650);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [combinedText, categoryId, dismissedSuggestion]);

  const activeSuggestion =
    !dismissedSuggestion &&
    combinedText.length >= 25 &&
    suggestedCat &&
    suggestedCat.id !== categoryId
      ? suggestedCat
      : null;

  function parseBudgetValues(): {
    min: number | null;
    max: number | null;
    error: string | null;
  } {
    const minTrimmed = budgetMinRaw.trim();
    const maxTrimmed = budgetMaxRaw.trim();

    const min = minTrimmed === "" ? null : Number(minTrimmed);
    const max = maxTrimmed === "" ? null : Number(maxTrimmed);

    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      return { min: null, max: null, error: "Minimum budget must be 0 or greater." };
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      return { min: null, max: null, error: "Maximum budget must be 0 or greater." };
    }
    if (min !== null && max !== null && min > max) {
      return {
        min: null,
        max: null,
        error: "Minimum budget cannot be greater than maximum budget.",
      };
    }

    return { min, max, error: null };
  }

  function validateClientSide(): string | null {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 120) {
      return "Job title must be between 5 and 120 characters.";
    }

    const cleanDesc = description.trim();
    if (cleanDesc.length < 20 || cleanDesc.length > 2000) {
      return "Job description must be between 20 and 2000 characters.";
    }

    if (!categoryId || !categories.some((c) => c.id === categoryId)) {
      return "Please select an active service category.";
    }

    if (!areaId || !areas.some((a) => a.id === areaId)) {
      return "Please select a service area in Lahore.";
    }

    return parseBudgetValues().error;
  }

  async function handleSubmit(publish: boolean) {
    setErrorMsg(null);
    const validationErr = validateClientSide();
    if (validationErr) {
      setErrorMsg(validationErr);
      return;
    }

    const { min, max } = parseBudgetValues();
    setSubmittingAction(publish ? "publish" : "draft");

    try {
      if (mode === "create") {
        const created = await createCustomerJob(
          {
            title: title.trim(),
            description: description.trim(),
            categoryId,
            areaId,
            budgetMin: min,
            budgetMax: max,
            urgency,
            publish,
          },
          { onWakingUp: setWakingUp }
        );
        router.push(`/dashboard/jobs/${created.id}`);
        router.refresh();
      } else if (jobId) {
        await updateDraftJob(
          jobId,
          {
            title: title.trim(),
            description: description.trim(),
            categoryId,
            areaId,
            budgetMin: min,
            budgetMax: max,
            urgency,
          },
          { onWakingUp: setWakingUp }
        );

        if (publish) {
          await publishCustomerJob(jobId, { onWakingUp: setWakingUp });
        }

        router.push(`/dashboard/jobs/${jobId}`);
        router.refresh();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to save your job. Please try again."
      );
      setSubmittingAction(null);
    }
  }

  const parsedBudget = parseBudgetValues();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(true);
      }}
      className="space-y-6"
      noValidate
    >
      <WakingServerBanner visible={wakingUp} />

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: What */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-[#DCE8E0] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Step 1 of 3 · What
          </span>
          <h2 className="mt-0.5 text-base font-bold text-[#0C2A1B]">
            What service do you need?
          </h2>
          <p className="mt-0.5 text-xs text-[#6A7B70]">
            Choose a trade category and describe the issue clearly so professionals can send accurate quotes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="category-filter"
              className="block text-xs font-semibold text-[#0C2A1B]"
            >
              Filter categories
            </label>
            <input
              id="category-filter"
              type="search"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search e.g. Plumbing, Electrical, AC..."
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] px-3.5 py-2 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="job-category"
              className="block text-xs font-semibold text-[#0C2A1B]"
            >
              Service category <span className="text-red-600">*</span>
            </label>
            <select
              id="job-category"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              {filteredCategories.length === 0 ? (
                <option value={categoryId}>{selectedCategoryName}</option>
              ) : (
                filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {activeSuggestion && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-[#E6F4EA]/70 px-3.5 py-2 text-xs text-[#0C2A1B]">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-[#0F6B3E]" aria-hidden="true" />
              <span>
                Suggested category: <strong>{activeSuggestion.name}</strong>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryId(activeSuggestion.id);
                  setSuggestedCat(null);
                }}
                className="rounded-lg bg-[#0F6B3E] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0A4D2B]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setDismissedSuggestion(true)}
                aria-label="Dismiss category suggestion"
                className="rounded-lg p-1 text-[#6A7B70] hover:bg-white hover:text-[#0C2A1B]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="job-title" className="block text-xs font-semibold text-[#0C2A1B]">
              Job title <span className="text-red-600">*</span>
            </label>
            <span className="text-[11px] text-[#6A7B70]">
              {title.trim().length} / 120 characters (min 5)
            </span>
          </div>
          <input
            id="job-title"
            type="text"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Replace leaking kitchen sink P-trap and mixer tap"
            required
            className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="job-description"
              className="block text-xs font-semibold text-[#0C2A1B]"
            >
              Problem description <span className="text-red-600">*</span>
            </label>
            <span
              className={`text-[11px] ${
                description.trim().length > 0 && description.trim().length < 20
                  ? "font-semibold text-amber-700"
                  : "text-[#6A7B70]"
              }`}
            >
              {description.trim().length} / 2000 characters (min 20)
            </span>
          </div>
          <textarea
            id="job-description"
            rows={4}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be repaired or installed, whether spare parts are needed, and any access notes..."
            required
            className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
          />
        </div>
      </section>

      {/* Section 2: Where & When */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-[#DCE8E0] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Step 2 of 3 · Where & When
          </span>
          <h2 className="mt-0.5 text-base font-bold text-[#0C2A1B]">
            Location & urgency
          </h2>
          <p className="mt-0.5 text-xs text-[#6A7B70]">
            Select your neighbourhood in Lahore and how soon you need a professional.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="job-area" className="block text-xs font-semibold text-[#0C2A1B]">
              Service area (Lahore) <span className="text-red-600">*</span>
            </label>
            <select
              id="job-area"
              value={areaId}
              onChange={(e) => setAreaId(Number(e.target.value))}
              required
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs font-medium text-[#0C2A1B] focus:border-[#0F6B3E] focus:outline-none"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-[#0C2A1B]">
              Urgency <span className="text-red-600">*</span>
            </legend>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 text-xs transition ${
                  urgency === "normal"
                    ? "border-[#0F6B3E] bg-[#E6F4EA]/60 text-[#0C2A1B] font-semibold"
                    : "border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value="normal"
                  checked={urgency === "normal"}
                  onChange={() => setUrgency("normal")}
                  className="sr-only"
                />
                <span>Normal</span>
                <span className="mt-0.5 text-[11px] font-normal text-[#6A7B70]">
                  Standard scheduling
                </span>
              </label>

              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 text-xs transition ${
                  urgency === "urgent"
                    ? "border-amber-600 bg-amber-50 text-amber-950 font-semibold"
                    : "border-[#DCE8E0] bg-white text-[#34453B] hover:bg-[#F4FAF6]"
                }`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value="urgent"
                  checked={urgency === "urgent"}
                  onChange={() => setUrgency("urgent")}
                  className="sr-only"
                />
                <span>Urgent</span>
                <span className="mt-0.5 text-[11px] font-normal text-[#6A7B70]">
                  Prioritized in alerts
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      {/* Section 3: Budget */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="border-b border-[#DCE8E0] pb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F6B3E]">
            Step 3 of 3 · Budget
          </span>
          <h2 className="mt-0.5 text-base font-bold text-[#0C2A1B]">
            Estimated budget in PKR (optional)
          </h2>
          <p className="mt-0.5 text-xs text-[#6A7B70]">
            Leave blank if you prefer open quotes from professionals.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="budget-min"
              className="block text-xs font-semibold text-[#0C2A1B]"
            >
              Minimum budget (PKR)
            </label>
            <input
              id="budget-min"
              type="number"
              min={0}
              step={100}
              value={budgetMinRaw}
              onChange={(e) => setBudgetMinRaw(e.target.value)}
              placeholder="e.g. 1500"
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="budget-max"
              className="block text-xs font-semibold text-[#0C2A1B]"
            >
              Maximum budget (PKR)
            </label>
            <input
              id="budget-max"
              type="number"
              min={0}
              step={100}
              value={budgetMaxRaw}
              onChange={(e) => setBudgetMaxRaw(e.target.value)}
              placeholder="e.g. 3500"
              className="mt-1.5 w-full rounded-xl border border-[#DCE8E0] bg-white px-3.5 py-2.5 text-xs text-[#0C2A1B] placeholder:text-[#6A7B70] focus:border-[#0F6B3E] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#DCE8E0] bg-[#F4FAF6] px-4 py-3 text-xs text-[#34453B]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0F6B3E]" aria-hidden="true" />
          <span>
            Prices are agreed directly with the professional; ProLink does not process payments.
          </span>
        </div>
      </section>

      {/* Review summary & submit buttons */}
      <section className="rounded-2xl border border-[#DCE8E0] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F6B3E]">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Review summary before posting</span>
        </div>

        <dl className="grid gap-3 rounded-xl border border-[#DCE8E0] bg-[#F8FBF9] p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[11px] text-[#6A7B70]">Category</dt>
            <dd className="mt-0.5 font-semibold text-[#0C2A1B]">{selectedCategoryName}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#6A7B70]">Service area</dt>
            <dd className="mt-0.5 font-semibold text-[#0C2A1B]">{selectedAreaName}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#6A7B70]">Urgency</dt>
            <dd className="mt-0.5 font-semibold capitalize text-[#0C2A1B]">{urgency}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-[#6A7B70]">Budget range</dt>
            <dd className="mt-0.5 font-semibold text-[#0C2A1B]">
              {formatBudgetRange(parsedBudget.min, parsedBudget.max)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href={mode === "edit" && jobId ? `/dashboard/jobs/${jobId}` : "/dashboard/jobs"}
            className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#34453B] transition hover:bg-[#F4FAF6]"
          >
            Cancel
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={submittingAction !== null}
              onClick={() => void handleSubmit(false)}
              className="rounded-xl border border-[#DCE8E0] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2A1B] transition hover:bg-[#F4FAF6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingAction === "draft"
                ? "Saving draft..."
                : mode === "edit"
                  ? "Save draft changes"
                  : "Save as draft"}
            </button>

            <button
              type="submit"
              disabled={submittingAction !== null}
              className="rounded-xl bg-[#0F6B3E] px-5 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0A4D2B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingAction === "publish"
                ? "Publishing job..."
                : mode === "edit"
                  ? "Publish job"
                  : "Post job"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
