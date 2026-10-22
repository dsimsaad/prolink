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

    // Simulate sending email to ProLink support
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
    <div className="contact-form-panel">
      <h2>Send us a message</h2>
      <p className="panel-intro">
        Fill out the form below and our support team in Islamabad will get back to you via email or phone.
      </p>

      {submitted && (
        <div className="contact-success-alert" role="status">
          <strong>✓ Thank you! Your message has been sent.</strong>
          <p style={{ marginTop: "4px", fontSize: "13.5px" }}>
            Our team reviews all inquiries promptly and will reply to your email within 2 to 4 business hours.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="contact-form-field">
          <label htmlFor="contact-name">Your Full Name *</label>
          <input
            id="contact-name"
            type="text"
            required
            placeholder="Muhammad Saad"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="contact-text-input"
          />
        </div>

        <div className="contact-form-field">
          <label htmlFor="contact-email">Email Address *</label>
          <input
            id="contact-email"
            type="email"
            required
            placeholder="saad@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="contact-text-input"
          />
        </div>

        <div className="contact-form-field">
          <label htmlFor="contact-phone">Phone Number (Optional)</label>
          <input
            id="contact-phone"
            type="tel"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="contact-text-input"
          />
        </div>

        <div className="contact-form-field">
          <label htmlFor="contact-topic">Inquiry Topic *</label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="contact-select-input"
          >
            <option value="general">General Inquiry</option>
            <option value="support">Customer Support &amp; Job Requests</option>
            <option value="professional">Professional Application &amp; Verification</option>
            <option value="billing">Escrow &amp; Payment Support</option>
            <option value="dispute">Report an Issue / Workmanship</option>
          </select>
        </div>

        <div className="contact-form-field">
          <label htmlFor="contact-message">Your Message *</label>
          <textarea
            id="contact-message"
            rows={5}
            required
            placeholder="Please describe your question, issue, or how we can help..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="contact-textarea-input"
          />
        </div>

        <button type="submit" className="contact-submit-btn" disabled={loading}>
          {loading ? "Sending your message..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
