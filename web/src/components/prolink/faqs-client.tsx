"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, HelpCircle } from "lucide-react";
import { siteConfig } from "@/config/site";

interface FaqItem {
  id: string;
  category: "customers" | "pros" | "payments" | "trust";
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    id: "pricing",
    category: "payments",
    question: "How does pricing work on ProLink?",
    answer:
      "Professionals submit upfront itemised quotes showing their estimated price, arrival window, and any inspection fee before you hire them, so you can compare offers side by side before work begins.",
  },
  {
    id: "review-process",
    category: "trust",
    question: "How are professionals reviewed before they offer services?",
    answer:
      "Applicants submit their trade categories, service areas, years of experience, and profile details. Our team reviews each application before enabling professional tools on the account. Because ProLink is a university semester project, government ID, biometric, or police checks are not performed.",
  },
  {
    id: "privacy",
    category: "trust",
    question: "Who can see my phone number when I post a job?",
    answer:
      "Your phone number stays private by default while professionals view your job request and send offers. It is shared only after you accept an offer from the professional you choose.",
  },
  {
    id: "job-free",
    category: "customers",
    question: "Is posting a job request free?",
    answer: `Yes, posting a job request is free for customers. Choose a category, describe what needs attention in ${siteConfig.city}, and compare itemised offers with no obligation to accept.`,
  },
  {
    id: "urgent-jobs",
    category: "customers",
    question: "What does marking a job urgent do?",
    answer:
      "When you mark a job urgent while posting, it is prioritised in matching so nearby professionals who cover your area see it first.",
  },
  {
    id: "apply-pro",
    category: "pros",
    question: "How do I apply to offer services as a professional?",
    answer:
      "Any signed-in ProLink user can open 'Become a Professional' to submit an application with their trade categories (1 to 5), coverage areas, years of experience, and short bio for team review.",
  },
  {
    id: "dual-role",
    category: "pros",
    question: "Can one ProLink account be both a customer and a professional?",
    answer:
      "Yes. ProLink uses a unified dual-role account model. Every account can post household jobs, and approved applicants also get access to professional tools to view matching requests and send offers.",
  },
  {
    id: "quotes",
    category: "customers",
    question: "How do inspection fees work?",
    answer:
      "If an on-site diagnostic check is needed before quoting a complex repair, the professional lists their inspection fee upfront inside the offer so you know the cost before accepting.",
  },
  {
    id: "coverage",
    category: "trust",
    question: "Which city does ProLink currently cover?",
    answer: `ProLink's active pilot city is ${siteConfig.city}, organised into neighbourhood areas so professionals can select the specific sectors they serve.`,
  },
  {
    id: "payment-methods",
    category: "payments",
    question: "Does ProLink process online payments?",
    answer:
      "Not yet. ProLink is a university semester project and does not process online payments or hold funds on the platform. You review and accept an itemised offer on ProLink and settle payment directly with your hired professional.",
  },
  {
    id: "reapply",
    category: "pros",
    question: "What happens if my professional application needs updates?",
    answer:
      "If an application needs changes, our team leaves feedback in a review note. You can read the note on your application page, update your details, and resubmit.",
  },
];

const categories = [
  { id: "all", label: "All Questions" },
  { id: "customers", label: "For Customers" },
  { id: "pros", label: "For Professionals" },
  { id: "payments", label: "Pricing & Payments" },
  { id: "trust", label: "Privacy & Review" },
];

export function FaqsClient() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openIds, setOpenIds] = useState<string[]>(["pricing", "review-process"]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

  return (
    <>
      <section className="faqs-hero">
        <div className="container">
          <span className="eyebrow-pill">
            <HelpCircle className="h-4 w-4 text-[var(--forest)]" aria-hidden="true" />
            Help &amp; Questions
          </span>
          <h1>Frequently Asked Questions</h1>
          <p>
            Straightforward answers about posting jobs in {siteConfig.city},
            comparing itemised offers, privacy, and applying as a professional.
          </p>
        </div>
      </section>

      <section className="faqs-main-container">
        <div className="faqs-category-filter" role="tablist" aria-label="Filter FAQs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`faqs-tab-btn ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="faqs-accordion-group">
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`faqs-accordion-card ${isOpen ? "open" : ""}`}
              >
                <button
                  type="button"
                  className="faqs-question-trigger"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                >
                  <span>{faq.question}</span>
                  <ChevronDown className="faqs-chevron-icon" aria-hidden="true" />
                </button>
                {isOpen && (
                  <div id={`faq-answer-${faq.id}`} className="faqs-answer-content">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="faqs-support-cta-box">
          <h2>Still have questions?</h2>
          <p>
            Send a message to our team in {siteConfig.city} for help with your
            account, job requests, or professional application.
          </p>
          <div className="faqs-cta-actions">
            <Link href="/contact" className="button">
              Contact Us <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/sign-in" className="button outline">
              Post a Job
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
