import "./contact.css";
import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
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
            <h1>Contact {siteConfig.name} Support</h1>
            <p>
              Have a question about posting a job, your professional
              application, or your account? Reach out to our team in{" "}
              {siteConfig.city}.
            </p>
          </div>
        </section>

        <section className="contact-main-container">
          <div className="contact-layout-grid">
            <div className="contact-info-stack">
              <div className="contact-card">
                <span className="icon-tile tile-hue-emerald">
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Phone Helpline</h3>
                  <p>Customer service assistance for general inquiries and support.</p>
                  <span className="contact-highlight-text">+92 (42) 111-776-546</span>
                  <div className="contact-sub-text">WhatsApp: +92 (300) 123-4567</div>
                </div>
              </div>

              <div className="contact-card">
                <span className="icon-tile tile-hue-amber">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Email Inquiries</h3>
                  <p>Send questions about jobs, professional applications, or feedback.</p>
                  <a
                    href={`mailto:${siteConfig.supportEmail}`}
                    className="contact-highlight-text"
                  >
                    {siteConfig.supportEmail}
                  </a>
                  <div className="contact-sub-text">Support &amp; Issue Reports: disputes@prolink.pk</div>
                </div>
              </div>

              <div className="contact-card">
                <span className="icon-tile tile-hue-teal">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="contact-card-content">
                  <h3>Pilot City</h3>
                  <p>
                    {siteConfig.name} Project Hub
                    <br />
                    {siteConfig.city}, Pakistan
                  </p>
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
                    Messages submitted outside these hours are answered the next working day
                  </div>
                </div>
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
