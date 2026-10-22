"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./brand";

interface FaqItem {
  id: string;
  category: "customers" | "pros" | "payments" | "trust";
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    id: "escrow",
    category: "payments",
    question: "How does ProLink protect my payment?",
    answer:
      "Every transaction on ProLink is protected by our secure escrow system. When you accept an offer, funds are held safely in escrow. They are only released to the tradesperson after the job is completed and you have verified the work to your complete satisfaction.",
  },
  {
    id: "verification",
    category: "trust",
    question: "How are professionals verified on ProLink?",
    answer:
      "Every professional undergoes multi-step verification including NADRA CNIC validation, biometric checks, and trade skill audits. We ensure all active professionals have verified identities and proven track records before they can submit offers.",
  },
  {
    id: "job-free",
    category: "customers",
    question: "Is posting a job request free?",
    answer:
      "Yes, posting a job request is 100% free for customers. You can post your job in under 60 seconds, upload photos of the issue, and receive itemized offers from certified local artisans with zero obligation.",
  },
  {
    id: "apply-pro",
    category: "pros",
    question: "How do I become a verified professional on ProLink?",
    answer:
      "Any registered ProLink user can apply to offer professional services by navigating to 'Become a professional' from their user menu. You will select your trade categories (1 to 5), coverage areas (1 to 12), years of experience, and bio. Our team reviews applications within 24 to 48 hours.",
  },
  {
    id: "dual-role",
    category: "pros",
    question: "Can one ProLink account be both a customer and a professional?",
    answer:
      "Yes! ProLink utilizes a unified dual-role account architecture. Every user has a standard account capable of posting jobs to hire help. Once your professional application is approved, you gain access to professional tools to receive job leads, send offers, and build your business.",
  },
  {
    id: "disputes",
    category: "customers",
    question: "What should I do if I am not satisfied with the completed work?",
    answer:
      "Because payments are held in escrow, funds are never released until you give your final approval. If an issue arises, you can request adjustments or contact ProLink support. Our team investigates the job history and mediates a fair resolution or refund.",
  },
  {
    id: "quotes",
    category: "customers",
    question: "How do inspection fees and transparent quotes work?",
    answer:
      "Artisans provide transparent, itemized quotes before starting work. If an on-site diagnostic inspection is required, the inspection fee is clearly stated in the professional's offer upfront. There are no hidden fees or surprise surcharges.",
  },
  {
    id: "coverage",
    category: "trust",
    question: "Which cities and areas does ProLink currently cover?",
    answer:
      "ProLink currently operates across major metropolitan hubs in Pakistan, including Islamabad, Rawalpindi, Lahore, and Karachi. Coverage areas are mapped by sector and neighborhood, allowing professionals to select exact service radiuses.",
  },
  {
    id: "payment-methods",
    category: "payments",
    question: "What payment methods are supported?",
    answer:
      "We support direct bank transfers (1Link, Raast), debit/credit cards (Visa, Mastercard, PayPak), and mobile wallets (Easypaisa, JazzCash). All transactions are encrypted and processed through certified PCI-DSS compliant gateways.",
  },
  {
    id: "reapply",
    category: "pros",
    question: "What happens if my professional application needs updates?",
    answer:
      "If an application requires adjustments, our team provides specific feedback in a review note. You can immediately review the feedback on the application page, update your skills or coverage areas, and reapply without starting over.",
  },
];

const categories = [
  { id: "all", label: "All Questions" },
  { id: "customers", label: "For Customers" },
  { id: "pros", label: "For Professionals" },
  { id: "payments", label: "Payments & Escrow" },
  { id: "trust", label: "Trust & Safety" },
];

export function FaqsClient() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openIds, setOpenIds] = useState<string[]>(["escrow", "verification"]);

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
          <span className="faqs-hero-badge">
            <Icon name="shield" />
            Help &amp; Knowledge Base
          </span>
          <h1>Frequently Asked Questions</h1>
          <p>
            Everything you need to know about hiring verified artisans, joining as
            a tradesperson, and our escrow payment protection.
          </p>
        </div>
      </section>

      <section className="faqs-main-container">
        {/* Category Pill Filters */}
        <div className="faqs-category-filter" role="tablist">
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

        {/* Dropdown Accordion List */}
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
                  <Icon name="chevron-down" className="faqs-chevron-icon" />
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

        {/* Support Help Box */}
        <div className="faqs-support-cta-box">
          <h2>Still have questions?</h2>
          <p>
            Our support team in Islamabad is available 6 days a week to help with your
            account, jobs, or professional verification.
          </p>
          <div className="faqs-cta-actions">
            <Link href="/contact" className="button">
              Contact Support <Icon name="arrow" />
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
