import "./contact.css";
import type { Metadata } from "next";
import { Clock, Mail, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/prolink/site-footer";
import { ContactForm } from "@/components/prolink/contact-form";
import { siteConfig } from "@/config/site";

const pageTitle = `Contact Us | ${siteConfig.name} ${siteConfig.city}`;
const pageDescription = `Get in touch with the ${siteConfig.name} team in ${siteConfig.city} for questions about job requests, accounts, or professional applications.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    siteName: siteConfig.name,
    locale: "en_PK",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="contact-page">
      <main id="main">
        <section className="contact-hero">
          <div className="container">
            <div className="contact-hero-badge">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Direct Support Desk</span>
            </div>
            <h1>Contact {siteConfig.name} Support</h1>
            <p>
              Have a question about posting a job, your account, or professional
              applications? Send our team in {siteConfig.city} a direct inquiry.
            </p>
          </div>
        </section>

        <section className="contact-main-container">
          <div className="contact-layout-grid">
            {/* Contact Form as the primary column */}
            <div className="contact-form-column">
              <ContactForm />
            </div>

            {/* Sidebar with Information Cards */}
            <aside className="contact-info-stack" aria-label="Support Information">
              <div className="contact-card contact-card-highlight">
                <span className="icon-tile tile-hue-emerald">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Direct Support Email</h3>
                  <p>Send questions about jobs, account assistance, or dispute reviews.</p>
                  <a
                    href="mailto:prolnk.support@gmail.com"
                    className="contact-highlight-text"
                  >
                    prolnk.support@gmail.com
                  </a>
                  <div className="contact-sub-text">Inquiries are answered via email by our desk</div>
                </div>
              </div>

              <div className="contact-card">
                <span className="icon-tile tile-hue-sky">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Response Hours</h3>
                  <p>Monday through Saturday: 9:00 AM – 8:00 PM PKT</p>
                  <div className="contact-note-accent">
                    Inquiries sent outside hours are answered next morning
                  </div>
                </div>
              </div>

              <div className="contact-card">
                <span className="icon-tile tile-hue-teal">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Project Hub</h3>
                  <p>
                    {siteConfig.name} Operations Hub
                    <br />
                    {siteConfig.city}, Pakistan
                  </p>
                </div>
              </div>

              <div className="contact-card">
                <span className="icon-tile tile-hue-amber">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Spam Protection</h3>
                  <p>
                    Daily inquiries are limited to 3 per client to protect our support inbox and ensure timely responses.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
