"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./brand";
import { useNavigationAccount } from "./use-navigation-account";
import { submitProfessionalApplicationAction } from "@/app/become-professional/actions";
import type { ProfessionalState } from "@/utils/professional";

export interface CategoryOption {
  id: number;
  name: string;
}

export interface AreaOption {
  id: number;
  name: string;
}

export interface MultiStepInitialData {
  userId: string;
  userEmail?: string;
  state: ProfessionalState;
  fullName: string;
  fatherName: string;
  cnic: string;
  phone: string;
  residentialAddress: string;
  selectedCategoryIds: number[];
  skillTags: string[];
  yearsExperience: number;
  bio: string;
  selectedAreaIds: number[];
  availability: "available" | "busy" | "offline";
  notificationPreference: "matching_only" | "all_jobs";
  reviewNote: string | null;
  appliedAt: string | null;
}

interface ProfessionalApplicationWizardProps {
  initialData: MultiStepInitialData;
  categories: CategoryOption[];
  areas: AreaOption[];
}

type WizardStep = 1 | 2 | 3;

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;
const PHONE_REGEX = /^\d{4}-\d{7}$/;

const SUGGESTED_SKILLS_BY_CATEGORY: Record<string, string[]> = {
  plumbing: [
    "Pipe Leak Repair",
    "Water Heater (Geyser) Installation",
    "Motor & Pump Repair",
    "Bathroom Fitting & Sanitary",
    "Drain Unblocking",
    "Water Tank Cleaning & Piping",
  ],
  electrical: [
    "UPS & Solar Inverter Wiring",
    "DB Box & Circuit Breakers",
    "Short Circuit Troubleshooting",
    "Ceiling Fan & Light Fitting",
    "3-Phase Commercial Wiring",
    "Earthing & Surge Protection",
  ],
  painting: [
    "Interior Emulsion Painting",
    "Exterior Weather Shield",
    "Wall Putty & Primer Prep",
    "Wood Polish & Lacquer",
    "Dampness & Seepage Treatment",
  ],
  carpentry: [
    "Door Lock & Hinge Repair",
    "Kitchen Cabinet Installation",
    "Wardrobe & Cupboard Work",
    "Custom Furniture Assembly",
    "Wood Termite Repair",
  ],
  ac: [
    "Inverter AC Gas Refill",
    "Split AC Installation",
    "AC Master Service & Chemical Wash",
    "PCB & Compressor Repair",
    "Cooling Coil Leak Fix",
  ],
  cleaning: [
    "Full Home Deep Cleaning",
    "Sofa & Carpet Shampooing",
    "Kitchen Degreasing",
    "Post-Renovation Cleanup",
    "Bathroom Sanitization",
  ],
  appliance: [
    "Automatic Washing Machine Repair",
    "Refrigerator & Deep Freezer Fix",
    "Microwave Oven Repair",
    "Cooking Range & Hood Service",
  ],
  masonry: [
    "Floor & Wall Tile Fixing",
    "Plaster & Brickwork",
    "Marble & Granite Fitting",
    "Roof Waterproofing",
  ],
};

function getSuggestedSkillsForCategories(
  selectedCatIds: number[],
  categories: CategoryOption[]
): string[] {
  const selectedNames = categories
    .filter((c) => selectedCatIds.includes(c.id))
    .map((c) => c.name.toLowerCase());

  const suggestions = new Set<string>();
  for (const name of selectedNames) {
    for (const [key, list] of Object.entries(SUGGESTED_SKILLS_BY_CATEGORY)) {
      if (name.includes(key)) {
        list.forEach((s) => suggestions.add(s));
      }
    }
  }

  if (suggestions.size === 0) {
    return [
      "On-Site Inspection",
      "Emergency Repair",
      "Preventive Maintenance",
      "New Installation",
      "Troubleshooting & Diagnostics",
    ];
  }

  return Array.from(suggestions);
}

export function formatCnicInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function formatPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Convert +923XX... or 923XX... to 03XX... if user pastes international format
  if (digits.startsWith("92") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
}

interface SavedApplicationDraft {
  step?: WizardStep;
  fullName?: string;
  fatherName?: string;
  cnic?: string;
  phone?: string;
  residentialAddress?: string;
  selectedCategories?: number[];
  skillTags?: string[];
  yearsExperience?: string;
  bio?: string;
  selectedAreas?: number[];
  availability?: "available" | "busy" | "offline";
  notificationPreference?: "matching_only" | "all_jobs";
}

function readSavedDraft(
  storageKey: string,
  state: ProfessionalState
): SavedApplicationDraft | null {
  if (typeof window === "undefined") return null;
  if (state !== "none" && state !== "rejected") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as SavedApplicationDraft;
  } catch {
    return null;
  }
}

export function ProfessionalApplicationWizard({
  initialData,
  categories,
  areas,
}: ProfessionalApplicationWizardProps) {
  const router = useRouter();
  const { refreshAccount } = useNavigationAccount();
  const storageKey = `prolink_pro_app_draft_${initialData.userId}`;
  const savedDraft = useMemo(
    () => readSavedDraft(storageKey, initialData.state),
    [storageKey, initialData.state]
  );

  const [step, setStep] = useState<WizardStep>(() =>
    savedDraft?.step === 1 || savedDraft?.step === 2 || savedDraft?.step === 3
      ? savedDraft.step
      : 1
  );

  // Step 1 fields: Personal Information
  const [fullName, setFullName] = useState(
    () =>
      (typeof savedDraft?.fullName === "string" && savedDraft.fullName) ||
      initialData.fullName
  );
  const [fatherName, setFatherName] = useState(
    () =>
      (typeof savedDraft?.fatherName === "string" && savedDraft.fatherName) ||
      initialData.fatherName
  );
  const [cnic, setCnic] = useState(() =>
    formatCnicInput(
      (typeof savedDraft?.cnic === "string" && savedDraft.cnic) ||
        initialData.cnic
    )
  );
  const [phone, setPhone] = useState(() =>
    formatPhoneInput(
      (typeof savedDraft?.phone === "string" && savedDraft.phone) ||
        initialData.phone
    )
  );
  const [residentialAddress, setResidentialAddress] = useState(
    () =>
      (typeof savedDraft?.residentialAddress === "string" &&
        savedDraft.residentialAddress) ||
      initialData.residentialAddress
  );

  // Step 2 fields: Professional Information
  const [selectedCategories, setSelectedCategories] = useState<number[]>(() =>
    Array.isArray(savedDraft?.selectedCategories) &&
    savedDraft.selectedCategories.length > 0
      ? savedDraft.selectedCategories
      : initialData.selectedCategoryIds
  );
  const [skillTags, setSkillTags] = useState<string[]>(() =>
    Array.isArray(savedDraft?.skillTags) && savedDraft.skillTags.length > 0
      ? savedDraft.skillTags
      : initialData.skillTags
  );
  const [skillInput, setSkillInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState<string>(() =>
    typeof savedDraft?.yearsExperience === "string"
      ? savedDraft.yearsExperience
      : String(initialData.yearsExperience ?? 3)
  );
  const [bio, setBio] = useState(
    () =>
      (typeof savedDraft?.bio === "string" && savedDraft.bio) || initialData.bio
  );
  const [selectedAreas, setSelectedAreas] = useState<number[]>(() =>
    Array.isArray(savedDraft?.selectedAreas) &&
    savedDraft.selectedAreas.length > 0
      ? savedDraft.selectedAreas
      : initialData.selectedAreaIds
  );
  const [availability, setAvailability] = useState<
    "available" | "busy" | "offline"
  >(() =>
    savedDraft?.availability === "available" ||
    savedDraft?.availability === "busy"
      ? savedDraft.availability
      : initialData.availability || "available"
  );

  // Step 3 fields: Notification Preferences
  const [notificationPreference, setNotificationPreference] = useState<
    "matching_only" | "all_jobs"
  >(() =>
    savedDraft?.notificationPreference === "matching_only" ||
    savedDraft?.notificationPreference === "all_jobs"
      ? savedDraft.notificationPreference
      : initialData.notificationPreference || "matching_only"
  );

  // Validation & submission states
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Persist draft on state change
  useEffect(() => {
    if (initialData.state !== "none" && initialData.state !== "rejected") {
      return;
    }
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          step,
          fullName,
          fatherName,
          cnic,
          phone,
          residentialAddress,
          selectedCategories,
          skillTags,
          yearsExperience,
          bio,
          selectedAreas,
          availability,
          notificationPreference,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    step,
    fullName,
    fatherName,
    cnic,
    phone,
    residentialAddress,
    selectedCategories,
    skillTags,
    yearsExperience,
    bio,
    selectedAreas,
    availability,
    notificationPreference,
    initialData.state,
    storageKey,
  ]);

  // ---------------------------------------------------------------------------
  // Status Views for Pending & Suspended Applications
  // ---------------------------------------------------------------------------
  if (initialData.state === "pending") {
    const selectedCategoryNames = categories
      .filter((c) => selectedCategories.includes(c.id))
      .map((c) => c.name);
    const selectedAreaNames = areas
      .filter((a) => selectedAreas.includes(a.id))
      .map((a) => a.name);

    return (
      <div className="status-card-box text-center">
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "var(--mint)",
            color: "var(--forest)",
            border: "1px solid #cde9d6",
          }}
        >
          <Icon name="check" className="w-7 h-7" />
        </div>
        <span className="pro-header-badge info">Pending Review</span>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "var(--ink)",
            marginTop: "8px",
            marginBottom: "12px",
          }}
        >
          Your Professional Application is Pending Review
        </h1>
        <p
          style={{
            color: "var(--body)",
            fontSize: "15px",
            maxWidth: "560px",
            margin: "0 auto 16px",
            lineHeight: 1.6,
          }}
        >
          You have already submitted an application to become a ProLink
          professional. Your application is currently awaiting review by our
          team.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--tile-sky-bg)",
            border: "1px solid var(--border)",
            color: "var(--tile-sky-fg)",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "28px",
          }}
        >
          <span>⏱️</span>
          <span>
            You will be notified of the outcome within 1–2 business days.
          </span>
        </div>

        {/* Application Summary */}
        <div
          style={{
            background: "var(--tint)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "22px",
            textAlign: "left",
            maxWidth: "580px",
            margin: "0 auto 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
              paddingBottom: "10px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--ink)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: 0,
              }}
            >
              Submitted Application Details
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "#eff6ff",
                color: "#1d4ed8",
              }}
            >
              Status: Pending Review
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            {fullName && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Full Name:
                </span>
                <strong style={{ color: "var(--ink)" }}>{fullName}</strong>
              </div>
            )}
            {fatherName && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Father&apos;s Name:
                </span>
                <strong style={{ color: "var(--ink)" }}>{fatherName}</strong>
              </div>
            )}
            {cnic && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  CNIC Number:
                </span>
                <strong style={{ color: "var(--ink)" }}>{cnic}</strong>
              </div>
            )}
            {phone && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Phone Number:
                </span>
                <strong style={{ color: "var(--ink)" }}>{phone}</strong>
              </div>
            )}
            {selectedCategoryNames.length > 0 && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Service Categories:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {selectedCategoryNames.join(", ")}
                </strong>
              </div>
            )}
            {skillTags.length > 0 && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Skills Offered:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {skillTags.join(", ")}
                </strong>
              </div>
            )}
            {yearsExperience && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Experience:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {yearsExperience} years
                </strong>
              </div>
            )}
            {selectedAreaNames.length > 0 && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Service Areas:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {selectedAreaNames.join(", ")}
                </strong>
              </div>
            )}
            <div>
              <span style={{ color: "var(--muted)", display: "block" }}>
                Notification Preference:
              </span>
              <strong style={{ color: "var(--ink)" }}>
                {notificationPreference === "all_jobs"
                  ? "All Available Jobs"
                  : "Matching Jobs Only"}
              </strong>
            </div>
            {initialData.appliedAt && (
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  Submitted On:
                </span>
                <strong style={{ color: "var(--ink)" }}>
                  {new Date(initialData.appliedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <Link href="/user" className="button">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (initialData.state === "suspended") {
    return (
      <div className="status-card-box text-center">
        <div
          className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "#fee2e2", color: "#b91c1c" }}
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
        </div>
        <span className="pro-header-badge danger">Account On Hold</span>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color: "var(--ink)",
            marginTop: "8px",
            marginBottom: "12px",
          }}
        >
          Professional account on hold
        </h1>
        {initialData.reviewNote && (
          <div className="review-note-callout text-left max-w-lg mx-auto">
            <strong>Administrator Note:</strong>
            <p style={{ marginTop: "4px" }}>{initialData.reviewNote}</p>
          </div>
        )}
        <p
          style={{
            color: "var(--body)",
            fontSize: "15px",
            maxWidth: "520px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Your professional privileges are currently on hold. For details or to
          request a status review, please contact our support team at{" "}
          <strong>prolnk.support@gmail.com</strong>.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/user" className="button">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step Validation Helpers
  // ---------------------------------------------------------------------------
  function validateStep1(): boolean {
    const errors: Record<string, string> = {};
    const cleanName = fullName.trim();
    const cleanFather = fatherName.trim();
    const cleanCnic = cnic.trim();
    const cleanPhone = phone.trim();
    const cleanAddr = residentialAddress.trim();

    if (!cleanName) {
      errors.fullName = "Full Name is required.";
    } else if (cleanName.length < 3) {
      errors.fullName = "Full Name must be at least 3 characters.";
    }

    if (!cleanFather) {
      errors.fatherName = "Father's Name is required.";
    } else if (cleanFather.length < 3) {
      errors.fatherName = "Father's Name must be at least 3 characters.";
    }

    if (!cleanCnic) {
      errors.cnic = "CNIC Number is required.";
    } else if (!CNIC_REGEX.test(cleanCnic)) {
      errors.cnic =
        "Enter a valid 13-digit CNIC in XXXXX-XXXXXXX-X format (e.g. 35202-1234567-1).";
    }

    if (!cleanPhone) {
      errors.phone = "Phone Number is required.";
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      errors.phone =
        "Enter a valid 11-digit phone number in XXXX-XXXXXXX format (e.g. 0300-1234567).";
    }

    if (!cleanAddr) {
      errors.residentialAddress = "Residential Address is required.";
    } else if (cleanAddr.length < 10) {
      errors.residentialAddress =
        "Please enter your complete residential address (at least 10 characters).";
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep2(): boolean {
    const errors: Record<string, string> = {};
    const cleanBio = bio.trim();
    const parsedYears = parseInt(yearsExperience, 10);

    // If user typed a skill in the input box and didn't click "Add", include it automatically
    let effectiveSkills = [...skillTags];
    if (skillInput.trim() && !effectiveSkills.includes(skillInput.trim())) {
      effectiveSkills = [...effectiveSkills, skillInput.trim()];
      setSkillTags(effectiveSkills);
      setSkillInput("");
    }

    if (selectedCategories.length < 1 || selectedCategories.length > 5) {
      errors.categories =
        "Please select at least 1 service category (up to 5).";
    }

    if (effectiveSkills.length < 1) {
      errors.skills =
        "Please add at least 1 skill or service that you offer.";
    }

    if (
      yearsExperience.trim() === "" ||
      isNaN(parsedYears) ||
      parsedYears < 0 ||
      parsedYears > 60
    ) {
      errors.yearsExperience =
        "Years of experience must be a number between 0 and 60.";
    }

    if (!cleanBio) {
      errors.bio = "Professional description is required.";
    } else if (cleanBio.length < 30) {
      errors.bio = `Description is too short (${cleanBio.length}/30 characters minimum).`;
    } else if (cleanBio.length > 1000) {
      errors.bio = `Description exceeds 1,000 characters (${cleanBio.length}/1000).`;
    }

    if (selectedAreas.length < 1 || selectedAreas.length > 12) {
      errors.areas = "Please select at least 1 service area (up to 12).";
    }

    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep3(): boolean {
    const errors: Record<string, string> = {};
    if (
      notificationPreference !== "matching_only" &&
      notificationPreference !== "all_jobs"
    ) {
      errors.notificationPreference =
        "Please choose a job notification preference.";
    }
    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  }

  // ---------------------------------------------------------------------------
  // Navigation & Handlers
  // ---------------------------------------------------------------------------
  function handleNextStep() {
    setSubmitError(null);
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  function handleBackStep() {
    setSubmitError(null);
    if (step === 2) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (step === 3) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrimaryCategoryChange(categoryIdStr: string) {
    const id = Number(categoryIdStr);
    if (!id || isNaN(id)) return;
    setSelectedCategories((prev) => {
      const withoutId = prev.filter((item) => item !== id);
      const next = [id, ...withoutId].slice(0, 5);
      return next;
    });
    if (step2Errors.categories) {
      setStep2Errors((prev) => ({ ...prev, categories: "" }));
    }
  }

  function toggleCategory(id: number) {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
    if (step2Errors.categories) {
      setStep2Errors((prev) => ({ ...prev, categories: "" }));
    }
  }

  function addSkillTag(rawSkill: string) {
    const clean = rawSkill.trim();
    if (!clean) return;
    if (skillTags.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkillInput("");
      return;
    }
    if (skillTags.length >= 25) return;
    setSkillTags((prev) => [...prev, clean]);
    setSkillInput("");
    if (step2Errors.skills) {
      setStep2Errors((prev) => ({ ...prev, skills: "" }));
    }
  }

  function removeSkillTag(skillToRemove: string) {
    setSkillTags((prev) => prev.filter((s) => s !== skillToRemove));
  }

  function toggleArea(id: number) {
    setSelectedAreas((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 12) {
        return prev;
      }
      return [...prev, id];
    });
    if (step2Errors.areas) {
      setStep2Errors((prev) => ({ ...prev, areas: "" }));
    }
  }

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const s1Valid = validateStep1();
    if (!s1Valid) {
      setStep(1);
      setSubmitError(
        "Please fix the highlighted errors in Step 1 (Personal Information)."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const s2Valid = validateStep2();
    if (!s2Valid) {
      setStep(2);
      setSubmitError(
        "Please fix the highlighted errors in Step 2 (Professional Information)."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const s3Valid = validateStep3();
    if (!s3Valid) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitProfessionalApplicationAction({
        fullName: fullName.trim(),
        fatherName: fatherName.trim(),
        cnic: cnic.trim(),
        phone: phone.trim(),
        residentialAddress: residentialAddress.trim(),
        selectedCategoryIds: selectedCategories,
        skillTags,
        yearsExperience: parseInt(yearsExperience, 10),
        bio: bio.trim(),
        selectedAreaIds: selectedAreas,
        availability,
        notificationPreference,
      });

      if (!result.ok) {
        if (result.existingStatus === "pending") {
          router.replace("/become-professional/submitted");
          router.refresh();
          return;
        }
        if (result.existingStatus === "approved") {
          router.replace("/user");
          router.refresh();
          return;
        }
        setSubmitError(result.error);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Ignore storage errors
      }

      refreshAccount();
      router.replace("/become-professional/submitted");
      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while submitting your application. Please try again."
      );
      setSubmitting(false);
    }
  }

  const isRejected = initialData.state === "rejected";
  const suggestedSkills = getSuggestedSkillsForCategories(
    selectedCategories,
    categories
  );

  const stepsMeta: { num: WizardStep; title: string; subtitle: string }[] = [
    {
      num: 1,
      title: "Personal Information",
      subtitle: "Identity & contact details",
    },
    {
      num: 2,
      title: "Professional Information",
      subtitle: "Trades, skills & service areas",
    },
    {
      num: 3,
      title: "Notification Preferences",
      subtitle: "Job alerts & final review",
    },
  ];

  const primaryCategoryId = selectedCategories[0] ?? "";
  const selectedCategoryNames = categories
    .filter((c) => selectedCategories.includes(c.id))
    .map((c) => c.name);
  const selectedAreaNames = areas
    .filter((a) => selectedAreas.includes(a.id))
    .map((a) => a.name);

  return (
    <div className="pro-form-card">
      {/* Header */}
      {isRejected ? (
        <div style={{ marginBottom: "24px" }}>
          <span className="pro-header-badge warning">
            Application Needs Update
          </span>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--ink)",
              marginTop: "6px",
              marginBottom: "8px",
            }}
          >
            Update Your Professional Application
          </h1>
          {initialData.reviewNote && (
            <div className="review-note-callout">
              <strong>Reviewer Feedback:</strong>
              <p style={{ marginTop: "4px" }}>
                &ldquo;{initialData.reviewNote}&rdquo;
              </p>
            </div>
          )}
          <p style={{ color: "var(--body)", fontSize: "14px" }}>
            Review and update your personal details, skills, and preferences
            below to resubmit your application.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          <span className="pro-header-badge info">
            Become a ProLink Professional
          </span>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--ink)",
              marginTop: "6px",
              marginBottom: "8px",
            }}
          >
            Professional Registration &amp; Application
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            Complete the 3-step application below to offer your trade skills
            to local households on ProLink.
          </p>
        </div>
      )}

      {/* Multi-Step Progress Indicator */}
      <div
        aria-label="Application progress"
        style={{
          marginBottom: "28px",
          padding: "18px 20px",
          background: "var(--tint)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <span style={{ color: "var(--forest)" }}>
            Step {step} of 3: {stepsMeta[step - 1].title}
          </span>
          <span style={{ color: "var(--muted)" }}>
            {3 - step === 0
              ? "Final step"
              : `${3 - step} step${3 - step > 1 ? "s" : ""} remaining`}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: "6px",
            background: "#dce8e0",
            borderRadius: "999px",
            overflow: "hidden",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(step / 3) * 100}%`,
              background: "var(--forest)",
              borderRadius: "999px",
              transition: "width 0.25s ease",
            }}
          />
        </div>

        {/* Stepper Items */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "10px",
          }}
        >
          {stepsMeta.map((item) => {
            const isCompleted = step > item.num;
            const isCurrent = step === item.num;
            return (
              <div
                key={item.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: isCurrent ? "white" : "transparent",
                  border: isCurrent
                    ? "1px solid var(--forest)"
                    : "1px solid transparent",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    flexShrink: 0,
                    background:
                      isCompleted || isCurrent ? "var(--forest)" : "white",
                    color:
                      isCompleted || isCurrent ? "white" : "var(--muted)",
                    border:
                      isCompleted || isCurrent
                        ? "none"
                        : "1px solid var(--border)",
                  }}
                >
                  {isCompleted ? "✓" : item.num}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: isCurrent || isCompleted ? 700 : 600,
                      color:
                        isCurrent || isCompleted
                          ? "var(--ink)"
                          : "var(--muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    className="hidden sm:block"
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Submission Error Banner */}
      {submitError && (
        <div
          role="alert"
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "24px",
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleFinalSubmit} noValidate>
        {/* ================================================================= */}
        {/* STEP 1: PERSONAL INFORMATION                                      */}
        {/* ================================================================= */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                Step 1: Personal Information
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                Provide your legal identity and contact details as shown on your
                government-issued CNIC.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              {/* Full Name */}
              <div>
                <label
                  htmlFor="pro-full-name"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  Full Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="pro-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (step1Errors.fullName) {
                      setStep1Errors((prev) => ({ ...prev, fullName: "" }));
                    }
                  }}
                  placeholder="e.g. Muhammad Tariq Mehmood"
                  aria-invalid={Boolean(step1Errors.fullName)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: step1Errors.fullName
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    color: "var(--ink)",
                  }}
                />
                {step1Errors.fullName && (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "5px",
                      fontWeight: 500,
                    }}
                  >
                    {step1Errors.fullName}
                  </p>
                )}
              </div>

              {/* Father's Name */}
              <div>
                <label
                  htmlFor="pro-father-name"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  Father&apos;s Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="pro-father-name"
                  type="text"
                  value={fatherName}
                  onChange={(e) => {
                    setFatherName(e.target.value);
                    if (step1Errors.fatherName) {
                      setStep1Errors((prev) => ({ ...prev, fatherName: "" }));
                    }
                  }}
                  placeholder="e.g. Abdul Majeed"
                  aria-invalid={Boolean(step1Errors.fatherName)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: step1Errors.fatherName
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    color: "var(--ink)",
                  }}
                />
                {step1Errors.fatherName && (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "5px",
                      fontWeight: 500,
                    }}
                  >
                    {step1Errors.fatherName}
                  </p>
                )}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              {/* CNIC Number */}
              <div>
                <label
                  htmlFor="pro-cnic"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    CNIC Number <span style={{ color: "#dc2626" }}>*</span>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    XXXXX-XXXXXXX-X
                  </span>
                </label>
                <input
                  id="pro-cnic"
                  type="text"
                  inputMode="numeric"
                  maxLength={15}
                  value={cnic}
                  onChange={(e) => {
                    const formatted = formatCnicInput(e.target.value);
                    setCnic(formatted);
                    if (step1Errors.cnic) {
                      setStep1Errors((prev) => ({ ...prev, cnic: "" }));
                    }
                  }}
                  placeholder="35202-1234567-1"
                  aria-invalid={Boolean(step1Errors.cnic)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: step1Errors.cnic
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink)",
                  }}
                />
                {step1Errors.cnic ? (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "5px",
                      fontWeight: 500,
                    }}
                  >
                    {step1Errors.cnic}
                  </p>
                ) : (
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    Format: 5 digits, 7 digits, and 1 digit separated by hyphens.
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="pro-phone-number"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    Phone Number <span style={{ color: "#dc2626" }}>*</span>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    XXXX-XXXXXXX
                  </span>
                </label>
                <input
                  id="pro-phone-number"
                  type="tel"
                  inputMode="numeric"
                  maxLength={12}
                  value={phone}
                  onChange={(e) => {
                    const formatted = formatPhoneInput(e.target.value);
                    setPhone(formatted);
                    if (step1Errors.phone) {
                      setStep1Errors((prev) => ({ ...prev, phone: "" }));
                    }
                  }}
                  placeholder="0300-1234567"
                  aria-invalid={Boolean(step1Errors.phone)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: step1Errors.phone
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink)",
                  }}
                />
                {step1Errors.phone ? (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "5px",
                      fontWeight: 500,
                    }}
                  >
                    {step1Errors.phone}
                  </p>
                ) : (
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: "11px",
                      marginTop: "4px",
                    }}
                  >
                    Format: 4 digits followed by 7 digits separated by a hyphen.
                  </p>
                )}
              </div>
            </div>

            {/* Residential Address */}
            <div style={{ marginBottom: "28px" }}>
              <label
                htmlFor="pro-address"
                style={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "6px",
                }}
              >
                Residential Address <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                id="pro-address"
                rows={3}
                value={residentialAddress}
                onChange={(e) => {
                  setResidentialAddress(e.target.value);
                  if (step1Errors.residentialAddress) {
                    setStep1Errors((prev) => ({
                      ...prev,
                      residentialAddress: "",
                    }));
                  }
                }}
                placeholder="e.g. House #14, Street 8, Sector G-9/2, Islamabad"
                aria-invalid={Boolean(step1Errors.residentialAddress)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: step1Errors.residentialAddress
                    ? "1px solid #dc2626"
                    : "1px solid var(--border)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: "var(--ink)",
                  resize: "vertical",
                }}
              />
              {step1Errors.residentialAddress && (
                <p
                  role="alert"
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "5px",
                    fontWeight: 500,
                  }}
                >
                  {step1Errors.residentialAddress}
                </p>
              )}
            </div>

            {/* Step 1 Footer Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="button"
                onClick={handleNextStep}
              >
                Next: Professional Information <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: PROFESSIONAL INFORMATION                                  */}
        {/* ================================================================= */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                Step 2: Professional Information
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                Tell us about your trade profession, skills, experience, and the
                service areas where you work.
              </p>
            </div>

            {/* 1. Primary Profession Dropdown + Additional Trade Categories */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="pro-primary-category"
                style={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "6px",
                }}
              >
                Primary Profession / Service Category{" "}
                <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                id="pro-primary-category"
                value={primaryCategoryId}
                onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "8px",
                  border: step2Errors.categories
                    ? "1px solid #dc2626"
                    : "1px solid var(--border)",
                  fontSize: "14px",
                  color: "var(--ink)",
                  background: "white",
                  marginBottom: "12px",
                }}
              >
                <option value="">Select your primary profession...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  You can also select additional trade categories you are
                  qualified for:
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color:
                      selectedCategories.length < 1 ||
                      selectedCategories.length > 5
                        ? "#b91c1c"
                        : "var(--forest)",
                  }}
                >
                  {selectedCategories.length}/5 selected
                </span>
              </div>

              <div className="pill-grid">
                {categories.map((cat) => {
                  const active = selectedCategories.includes(cat.id);
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      className={`pill-button ${active ? "active" : ""}`}
                      onClick={() => toggleCategory(cat.id)}
                      aria-pressed={active}
                    >
                      {active ? "✓ " : "+ "}
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              {step2Errors.categories && (
                <p
                  role="alert"
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {step2Errors.categories}
                </p>
              )}
            </div>

            {/* 2. Skills and Services Offered */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="pro-skill-input"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                <span>
                  Skills &amp; Services Offered{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--muted)",
                  }}
                >
                  {skillTags.length} added
                </span>
              </label>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Add specific services you provide (e.g., Pipe Leak Repair, UPS
                Wiring, Split AC Installation).
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <input
                  id="pro-skill-input"
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkillTag(skillInput);
                    }
                  }}
                  placeholder="Type a skill and press Enter or click Add..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: step2Errors.skills
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  className="button outline small"
                  onClick={() => addSkillTag(skillInput)}
                  style={{ minHeight: "42px", paddingInline: "18px" }}
                >
                  + Add Skill
                </button>
              </div>

              {/* Selected Skill Tags */}
              {skillTags.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  {skillTags.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "999px",
                        background: "var(--mint)",
                        border: "1px solid #cde9d6",
                        color: "var(--forest)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkillTag(skill)}
                        aria-label={`Remove ${skill}`}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "var(--forest)",
                          fontWeight: 700,
                          fontSize: "14px",
                          lineHeight: 1,
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Suggested Skills */}
              <div
                style={{
                  background: "var(--tint)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  Suggested skills (click to add):
                </span>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                >
                  {suggestedSkills.map((suggestion) => {
                    const alreadyAdded = skillTags.some(
                      (s) => s.toLowerCase() === suggestion.toLowerCase()
                    );
                    return (
                      <button
                        type="button"
                        key={suggestion}
                        disabled={alreadyAdded}
                        onClick={() => addSkillTag(suggestion)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          border: "1px solid var(--border)",
                          background: alreadyAdded ? "#e6f4ea" : "white",
                          color: alreadyAdded
                            ? "var(--forest)"
                            : "var(--body)",
                          cursor: alreadyAdded ? "default" : "pointer",
                          opacity: alreadyAdded ? 0.65 : 1,
                        }}
                      >
                        {alreadyAdded ? `✓ ${suggestion}` : `+ ${suggestion}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {step2Errors.skills && (
                <p
                  role="alert"
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {step2Errors.skills}
                </p>
              )}
            </div>

            {/* 3. Years of Experience & Availability */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
                marginBottom: "22px",
              }}
            >
              <div>
                <label
                  htmlFor="pro-years-exp"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  Years of Experience (0 – 60){" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  id="pro-years-exp"
                  type="number"
                  min={0}
                  max={60}
                  value={yearsExperience}
                  onChange={(e) => {
                    setYearsExperience(e.target.value);
                    if (step2Errors.yearsExperience) {
                      setStep2Errors((prev) => ({
                        ...prev,
                        yearsExperience: "",
                      }));
                    }
                  }}
                  aria-invalid={Boolean(step2Errors.yearsExperience)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: step2Errors.yearsExperience
                      ? "1px solid #dc2626"
                      : "1px solid var(--border)",
                    fontSize: "14px",
                    color: "var(--ink)",
                  }}
                />
                {step2Errors.yearsExperience && (
                  <p
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12px",
                      marginTop: "5px",
                      fontWeight: 500,
                    }}
                  >
                    {step2Errors.yearsExperience}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pro-availability"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--ink)",
                    marginBottom: "6px",
                  }}
                >
                  Current Availability
                </label>
                <select
                  id="pro-availability"
                  value={availability}
                  onChange={(e) =>
                    setAvailability(
                      e.target.value as "available" | "busy" | "offline"
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                    color: "var(--ink)",
                    background: "white",
                  }}
                >
                  <option value="available">
                    Available for Immediate Jobs
                  </option>
                  <option value="busy">
                    Available for Scheduled Bookings
                  </option>
                </select>
              </div>
            </div>

            {/* 4. Professional Description / Short Bio */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="pro-bio-textarea"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                <span>
                  Professional Description / Short Bio{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <span
                  className={`char-counter ${
                    bio.trim().length > 0 &&
                    (bio.trim().length < 30 || bio.trim().length > 1000)
                      ? "error"
                      : ""
                  }`}
                >
                  {bio.trim().length}/1,000 chars (min 30)
                </span>
              </label>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "8px",
                }}
              >
                Summarize your practical experience, tools, specialties, and
                typical project turnaround.
              </p>
              <textarea
                id="pro-bio-textarea"
                rows={4}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  if (step2Errors.bio) {
                    setStep2Errors((prev) => ({ ...prev, bio: "" }));
                  }
                }}
                placeholder="E.g., Skilled technician with 6+ years of residential experience. Equipped with proper diagnostic tools and committed to clean, transparent work..."
                aria-invalid={Boolean(step2Errors.bio)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: step2Errors.bio
                    ? "1px solid #dc2626"
                    : "1px solid var(--border)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
              {step2Errors.bio && (
                <p
                  role="alert"
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "5px",
                    fontWeight: 500,
                  }}
                >
                  {step2Errors.bio}
                </p>
              )}
            </div>

            {/* 5. Service Coverage Areas */}
            <div style={{ marginBottom: "28px" }}>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                <span>
                  Service Coverage Areas{" "}
                  <span style={{ color: "#dc2626" }}>*</span>
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color:
                      selectedAreas.length < 1 || selectedAreas.length > 12
                        ? "#b91c1c"
                        : "var(--forest)",
                  }}
                >
                  {selectedAreas.length}/12 selected (1–12 required)
                </span>
              </label>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "10px",
                }}
              >
                Select the locations and sectors where you are willing to travel
                for customer jobs.
              </p>
              <div className="pill-grid">
                {areas.map((area) => {
                  const active = selectedAreas.includes(area.id);
                  return (
                    <button
                      type="button"
                      key={area.id}
                      className={`pill-button ${active ? "active" : ""}`}
                      onClick={() => toggleArea(area.id)}
                      aria-pressed={active}
                    >
                      {active ? "✓ " : "+ "}
                      {area.name}
                    </button>
                  );
                })}
              </div>
              {step2Errors.areas && (
                <p
                  role="alert"
                  style={{
                    color: "#dc2626",
                    fontSize: "12px",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {step2Errors.areas}
                </p>
              )}
            </div>

            {/* Step 2 Footer Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="button outline"
                onClick={handleBackStep}
              >
                ← Back
              </button>
              <button
                type="button"
                className="button"
                onClick={handleNextStep}
              >
                Next: Notification Preferences <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 3: NOTIFICATION PREFERENCES & FINAL SUBMISSION               */}
        {/* ================================================================= */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  margin: "0 0 4px",
                }}
              >
                Step 3: Notification Preferences
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>
                Choose how you want to be notified when customers post new jobs
                on ProLink.
              </p>
            </div>

            {/* Selectable Radio Cards */}
            <div
              role="radiogroup"
              aria-label="Job Notification Preferences"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginBottom: "24px",
              }}
            >
              {/* Option 1: Matching Jobs Only */}
              <label
                htmlFor="pref-matching-only"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "18px 20px",
                  borderRadius: "12px",
                  border:
                    notificationPreference === "matching_only"
                      ? "2px solid var(--forest)"
                      : "1px solid var(--border)",
                  background:
                    notificationPreference === "matching_only"
                      ? "var(--tint)"
                      : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  id="pref-matching-only"
                  type="radio"
                  name="notificationPreference"
                  value="matching_only"
                  checked={notificationPreference === "matching_only"}
                  onChange={() => {
                    setNotificationPreference("matching_only");
                    setStep3Errors({});
                  }}
                  style={{
                    marginTop: "3px",
                    width: "18px",
                    height: "18px",
                    accentColor: "var(--forest)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "15px",
                        color: "var(--ink)",
                      }}
                    >
                      Matching Jobs Only
                    </strong>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "var(--mint)",
                        color: "var(--forest)",
                      }}
                    >
                      Recommended
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--body)",
                      marginTop: "6px",
                      lineHeight: 1.5,
                    }}
                  >
                    Receive notifications only for jobs that match your selected
                    service categories, skills, and coverage areas.
                  </p>
                </div>
              </label>

              {/* Option 2: All Available Jobs */}
              <label
                htmlFor="pref-all-jobs"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "18px 20px",
                  borderRadius: "12px",
                  border:
                    notificationPreference === "all_jobs"
                      ? "2px solid var(--forest)"
                      : "1px solid var(--border)",
                  background:
                    notificationPreference === "all_jobs"
                      ? "var(--tint)"
                      : "white",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  id="pref-all-jobs"
                  type="radio"
                  name="notificationPreference"
                  value="all_jobs"
                  checked={notificationPreference === "all_jobs"}
                  onChange={() => {
                    setNotificationPreference("all_jobs");
                    setStep3Errors({});
                  }}
                  style={{
                    marginTop: "3px",
                    width: "18px",
                    height: "18px",
                    accentColor: "var(--forest)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "15px",
                      color: "var(--ink)",
                    }}
                  >
                    All Available Jobs
                  </strong>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--body)",
                      marginTop: "6px",
                      lineHeight: 1.5,
                    }}
                  >
                    Receive notifications about all available jobs posted on
                    ProLink, regardless of whether they match your profile.
                  </p>
                </div>
              </label>
            </div>

            {step3Errors.notificationPreference && (
              <p
                role="alert"
                style={{
                  color: "#dc2626",
                  fontSize: "12px",
                  marginBottom: "16px",
                  fontWeight: 500,
                }}
              >
                {step3Errors.notificationPreference}
              </p>
            )}

            {/* Application Review Summary before Final Submit */}
            <div
              style={{
                background: "var(--tint)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "18px 20px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--ink)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    margin: 0,
                  }}
                >
                  Application Summary
                </h3>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setStep(1)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: "12px",
                    }}
                  >
                    Edit Personal Info
                  </button>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setStep(2)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: "12px",
                    }}
                  >
                    Edit Professional Info
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Full Name:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>{fullName}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Father&apos;s Name:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>{fatherName}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    CNIC Number:
                  </span>
                  <strong
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {cnic}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Phone Number:
                  </span>
                  <strong
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {phone}
                  </strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Residential Address:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {residentialAddress}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Service Categories:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {selectedCategoryNames.join(", ")}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Years of Experience:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {yearsExperience} years
                  </strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Skills &amp; Services Offered:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {skillTags.join(", ")}
                  </strong>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", display: "block" }}>
                    Coverage Areas:
                  </span>
                  <strong style={{ color: "var(--ink)" }}>
                    {selectedAreaNames.join(", ")}
                  </strong>
                </div>
              </div>
            </div>

            {/* Step 3 Footer Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className="button outline"
                onClick={handleBackStep}
                disabled={submitting}
              >
                ← Back
              </button>
              <button
                type="submit"
                className="button"
                disabled={submitting}
                style={{ minWidth: "220px" }}
              >
                {submitting
                  ? "Submitting Application..."
                  : isRejected
                    ? "Update & Submit Application"
                    : "Submit Application"}{" "}
                {!submitting && <Icon name="arrow" />}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
