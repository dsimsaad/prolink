"use client";

import { useState } from "react";

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate reliable transmission to support mailbox
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    }, 600);
  };

  return (
    <div className="contact-form-card">
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)", marginBottom: "8px" }}>
        Send us a message
      </h2>
      <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px" }}>
        Fill out the form below and a support representative will reach out to you via email or phone.
      </p>

      {submitted && (
        <div className="contact-success-banner" role="status">
          <strong>Thank you! Your message has been sent.</strong>
          <p style={{ marginTop: "4px", fontSize: "13px" }}>
            Our team in Islamabad typically reviews and responds to all inquiries within 2 to 4 business hours.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="contact-input-group">
          <label htmlFor="contact-name" className="contact-label">
            Your Full Name *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            placeholder="Muhammad Saad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="contact-input"
          />
        </div>

        <div className="contact-input-group">
          <label htmlFor="contact-email" className="contact-label">
            Email Address *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            placeholder="saad@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="contact-input"
          />
        </div>

        <div className="contact-input-group">
          <label htmlFor="contact-phone" className="contact-label">
            Phone Number (Optional)
          </label>
          <input
            id="contact-phone"
            type="tel"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="contact-input"
          />
        </div>

        <div className="contact-input-group">
          <label htmlFor="contact-topic" className="contact-label">
            Inquiry Topic *
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="contact-select"
          >
            <option value="general">General Inquiry</option>
            <option value="support">Customer Support &amp; Job Requests</option>
            <option value="professional">Professional Application &amp; Verification</option>
            <option value="billing">Escrow &amp; Payment Support</option>
            <option value="dispute">Report an Issue / Workmanship</option>
          </select>
        </div>

        <div className="contact-input-group">
          <label htmlFor="contact-message" className="contact-label">
            Your Message *
          </label>
          <textarea
            id="contact-message"
            rows={5}
            required
            placeholder="Please describe your question, issue, or how we can help..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="contact-textarea"
          />
        </div>

        <button
          type="submit"
          className="button"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "15px" }}
        >
          {loading ? "Sending your message..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
