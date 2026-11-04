"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const MAX_DAILY_QUERIES = 3;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "prolink_contact_queries";
const TARGET_EMAIL = "prolnk.support@gmail.com";

interface SuccessNotice {
  senderName: string;
  senderEmail: string;
  topic: string;
  timeString: string;
  gmailComposeUrl?: string;
  mailtoUrl?: string;
}

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rate limiting state
  const [queryCount, setQueryCount] = useState<number>(0);
  const [hoursRemaining, setHoursRemaining] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);

  // Floating Pop-up Toast notification state
  const [showPopup, setShowPopup] = useState(false);
  const popupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read stored queries and calculate remaining window
  const evaluateRateLimit = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: number[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();

      // Only keep timestamps from the last 24 hours
      const valid = parsed.filter(
        (ts) => typeof ts === "number" && now - ts < WINDOW_MS
      );

      if (valid.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
      }

      setQueryCount(valid.length);

      if (valid.length >= MAX_DAILY_QUERIES) {
        valid.sort((a, b) => a - b);
        const oldest = valid[0];
        const msRemaining = oldest + WINDOW_MS - now;
        const hours = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)));

        setIsRateLimited(true);
        setHoursRemaining(hours);
      } else {
        setIsRateLimited(false);
        setHoursRemaining(0);
      }
    } catch {
      setIsRateLimited(false);
    }
  }, []);

  useEffect(() => {
    evaluateRateLimit();
    const interval = setInterval(evaluateRateLimit, 30000);
    return () => clearInterval(interval);
  }, [evaluateRateLimit]);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

  const triggerPopup = () => {
    setShowPopup(true);
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }
    // Auto-dismiss after 5 seconds
    popupTimerRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 5000);
  };

  const closePopup = () => {
    setShowPopup(false);
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isRateLimited) {
      setErrorMsg(
        `You have reached the daily limit of ${MAX_DAILY_QUERIES} queries. Please wait ${hoursRemaining} hour${
          hoursRemaining > 1 ? "s" : ""
        } before sending more queries.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          topic,
          message,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 429) {
        const hours = data?.hoursRemaining || 24;
        setIsRateLimited(true);
        setHoursRemaining(hours);
        setErrorMsg(
          data?.message ||
            `Daily query limit reached. Please wait ${hours} hour${
              hours > 1 ? "s" : ""
            } before sending more queries.`
        );
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit inquiry. Please try again.");
      }

      // Record query in localStorage
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: number[] = raw ? JSON.parse(raw) : [];
      list.push(Date.now());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // Save success notice to display in the form banner
      const nowFormatted = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setSuccessNotice({
        senderName: fullName,
        senderEmail: email,
        topic,
        timeString: nowFormatted,
        gmailComposeUrl: data?.gmailComposeUrl,
        mailtoUrl: data?.mailtoUrl,
      });

      // Clear input values so the user sees the submission succeeded
      setFullName("");
      setEmail("");
      setTopic("general");
      setMessage("");

      // Re-evaluate rate limit immediately
      evaluateRateLimit();

      // Trigger floating top popup toast (5 seconds)
      triggerPopup();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong while sending your inquiry.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const remainingCount = Math.max(0, MAX_DAILY_QUERIES - queryCount);

  return (
    <>
      {/* 1. FLOATING POPUP TOAST (Centered at top of viewport for 5 seconds) */}
      {showPopup && (
        <aside
          className="contact-popup-toast"
          role="status"
          aria-live="polite"
        >
          <div className="contact-toast-icon-wrap">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="contact-toast-body">
            <h4 className="contact-toast-title">Email Sent Successfully!</h4>
            <p className="contact-toast-desc">
              Your inquiry has been delivered to <strong>{TARGET_EMAIL}</strong>. Our team will review your message promptly.
            </p>
          </div>
          <button
            type="button"
            className="contact-toast-close"
            onClick={closePopup}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* 2. MAIN CONTACT FORM PANEL (Always visible, fully styled, never disappears) */}
      <div className="contact-form-panel">
        {/* Panel Header */}
        <div className="contact-form-header">
          <div className="contact-header-copy">
            <div className="contact-header-badge">
              <Sparkles className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
              <span>Direct Support Inbox</span>
            </div>
            <h2>Send us a message</h2>
            <p className="panel-intro">
              Have a question or need assistance? Fill out the form and our team in Lahore will respond via email.
            </p>
          </div>

          {/* Daily Quota Counter Badge */}
          <div
            className={`contact-quota-pill ${
              isRateLimited
                ? "quota-depleted"
                : queryCount === 2
                ? "quota-warning"
                : "quota-normal"
            }`}
            title="To prevent spam, query submissions are limited to 3 per day"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {isRateLimited
                ? "Limit reached (3/3)"
                : `${remainingCount} of ${MAX_DAILY_QUERIES} queries left today`}
            </span>
          </div>
        </div>

        {/* 3. INLINE SUCCESS CONFIRMATION BANNER (Above form fields, keeps form intact) */}
        {successNotice && (
          <div className="contact-inline-success" role="region" aria-label="Submission Notice">
            <div className="contact-success-left">
              <div className="contact-success-icon-badge">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="contact-success-text">
                <div className="contact-success-headline">
                  <strong>Message Sent Successfully to {TARGET_EMAIL}!</strong>
                  <span className="contact-success-time">{successNotice.timeString}</span>
                </div>
                <p>
                  Thank you, <strong>{successNotice.senderName}</strong>. Your query has been delivered to our support team. We will reply directly to <strong>{successNotice.senderEmail}</strong> within 2 to 4 business hours.
                </p>
                {successNotice.gmailComposeUrl && (
                  <div className="contact-success-links">
                    <a
                      href={successNotice.gmailComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-quick-link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View thread in Gmail
                    </a>
                    {successNotice.mailtoUrl && (
                      <a
                        href={successNotice.mailtoUrl}
                        className="contact-quick-link"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Open default mail client
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="contact-inline-dismiss"
              onClick={() => setSuccessNotice(null)}
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4. RATE LIMIT WARNING BANNER (When limit reached) */}
        {isRateLimited && (
          <div className="contact-limit-card" role="alert">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="contact-limit-text">
              <strong>Daily Query Limit Reached (3 of 3 queries sent)</strong>
              <p>
                To maintain high response quality and prevent inbox spam, submissions are limited to {MAX_DAILY_QUERIES} queries per day.
                Please wait <strong>{hoursRemaining} hour{hoursRemaining > 1 ? "s" : ""}</strong> before you can send more queries.
              </p>
            </div>
          </div>
        )}

        {/* 5. ERROR BANNER (If submission failed) */}
        {errorMsg && !isRateLimited && (
          <div className="contact-error-card" role="alert">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="contact-error-text">
              <strong>Unable to deliver message</strong>
              <p>{errorMsg}</p>
            </div>
            <button
              type="button"
              className="contact-inline-dismiss"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 6. THE CONTACT FORM (Always present with inputs, buttons, and responsive grid) */}
        <form onSubmit={handleSubmit} className="contact-actual-form">
          {/* Two-column layout on desktop for Name & Email */}
          <div className="contact-form-row">
            <div className="contact-form-field">
              <label htmlFor="contact-name">
                Your Full Name <span className="field-required">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                required
                disabled={isRateLimited || loading}
                placeholder="e.g. Muhammad Saad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="contact-text-input"
                autoComplete="name"
              />
            </div>

            <div className="contact-form-field">
              <label htmlFor="contact-email">
                Your Email Address <span className="field-required">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                required
                disabled={isRateLimited || loading}
                placeholder="saad@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="contact-text-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Inquiry Topic Dropdown */}
          <div className="contact-form-field">
            <label htmlFor="contact-topic">
              Inquiry Topic <span className="field-required">*</span>
            </label>
            <div className="contact-select-wrap">
              <select
                id="contact-topic"
                value={topic}
                disabled={isRateLimited || loading}
                onChange={(e) => setTopic(e.target.value)}
                className="contact-select-input"
              >
                <option value="general">General Inquiry</option>
                <option value="support">Customer Support &amp; Job Requests</option>
                <option value="professional">Professional Application Assistance</option>
                <option value="billing">Billing &amp; Payment Support</option>
                <option value="dispute">Report an Issue / Service Feedback</option>
              </select>
            </div>
          </div>

          {/* Message Textarea */}
          <div className="contact-form-field">
            <div className="contact-label-row">
              <label htmlFor="contact-message">
                Your Message <span className="field-required">*</span>
              </label>
              <span className="contact-label-hint">
                Sent to {TARGET_EMAIL}
              </span>
            </div>
            <textarea
              id="contact-message"
              rows={5}
              required
              disabled={isRateLimited || loading}
              placeholder="Describe your inquiry, request, or issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="contact-textarea-input"
            />
          </div>

          {/* Form Actions Row: Primary Submit Button & Supplementary Controls */}
          <div className="contact-actions-bar">
            <button
              type="submit"
              className="contact-submit-btn"
              disabled={loading || isRateLimited}
            >
              {loading ? (
                <span className="contact-btn-spinner-wrap">
                  <span className="contact-spinner" aria-hidden="true" />
                  <span>Sending to {TARGET_EMAIL}...</span>
                </span>
              ) : isRateLimited ? (
                <span className="contact-btn-content">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>Wait {hoursRemaining}h to Send More Queries</span>
                </span>
              ) : (
                <span className="contact-btn-content">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{successNotice ? "Send Another Message" : "Send Message to Support"}</span>
                </span>
              )}
            </button>

            {/* Quick compose mailto button if the user prefers external client */}
            <a
              href={`mailto:${TARGET_EMAIL}?subject=${encodeURIComponent("ProLink Support Inquiry")}`}
              className="contact-direct-mail-btn"
              title="Open your device's default mail application"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              <span>Email directly via {TARGET_EMAIL}</span>
            </a>
          </div>

          {/* Security and SLA Trust Footnote */}
          <div className="contact-trust-footer">
            <div className="trust-item">
              <ShieldCheck className="h-3.5 w-3.5 text-forest" />
              <span>Spam protected (3 daily limit)</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <Clock className="h-3.5 w-3.5 text-forest" />
              <span>Average response: 2–4 hours</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <Mail className="h-3.5 w-3.5 text-forest" />
              <span>{TARGET_EMAIL}</span>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}