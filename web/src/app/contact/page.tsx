import "./contact.css";
import { SiteHeader } from "@/components/prolink/site-header";
import { SiteFooter } from "@/components/prolink/site-footer";
import { ContactForm } from "@/components/prolink/contact-form";
import { Icon } from "@/components/prolink/brand";

export const metadata = {
  title: "Contact Us | ProLink",
  description:
    "Get in touch with the ProLink support team in Islamabad. Reach us by email, phone, or send us a direct message.",
};

export default function ContactPage() {
  return (
    <div className="contact-page">
      <SiteHeader currentPage="contact" />
      <main id="main">
        <section className="contact-hero">
          <div className="container">
            <span className="contact-hero-badge">
              <Icon name="mail" />
              We&apos;re here to help
            </span>
            <h1>Contact ProLink Support</h1>
            <p>
              Have a question about a job, your professional application, or need
              assistance? Our dedicated team in Islamabad is ready to assist.
            </p>
          </div>
        </section>

        <section className="contact-main-container">
          <div className="contact-layout-grid">
            {/* Left Column: Contact Details Stack */}
            <div className="contact-info-stack">
              <div className="contact-card">
                <span className="contact-card-icon">
                  <Icon name="phone" />
                </span>
                <div className="contact-card-content">
                  <h3>Direct Phone Helpline</h3>
                  <p>Speak directly with our customer support center in Pakistan.</p>
                  <span className="contact-highlight-text">+92 (51) 111-776-546</span>
                  <div className="contact-sub-text">WhatsApp: +92 (300) 123-4567</div>
                </div>
              </div>

              <div className="contact-card">
                <span className="contact-card-icon">
                  <Icon name="mail" />
                </span>
                <div className="contact-card-content">
                  <h3>Email Inquiries</h3>
                  <p>Send job details, document verification, or partnership inquiries.</p>
                  <a
                    href="mailto:support@prolink.pk"
                    className="contact-highlight-text"
                    style={{ textDecoration: "none" }}
                  >
                    support@prolink.pk
                  </a>
                  <div className="contact-sub-text">Escrow Disputes: disputes@prolink.pk</div>
                </div>
              </div>

              <div className="contact-card">
                <span className="contact-card-icon">
                  <Icon name="pin" />
                </span>
                <div className="contact-card-content">
                  <h3>Head Office</h3>
                  <p>
                    ProLink Technologies Pakistan (Pvt) Ltd.
                    <br />
                    4th Floor, Evacuee Trust Complex, F-5/1,
                    <br />
                    Islamabad, 44000, Pakistan
                  </p>
                </div>
              </div>

              <div className="contact-card">
                <span className="contact-card-icon">
                  <Icon name="clock" />
                </span>
                <div className="contact-card-content">
                  <h3>Operating Hours</h3>
                  <p>Monday through Saturday: 9:00 AM – 8:00 PM PKT</p>
                  <div style={{ fontSize: "12px", color: "#0f6b3e", fontWeight: 700 }}>
                    Emergency escalation available 24/7 for active escrow jobs
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Direct Email / Message Form */}
            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
