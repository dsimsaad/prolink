import Link from "next/link";
import { Brand } from "./brand";

const services = [
  "Plumbing",
  "Electrical",
  "AC Repair & HVAC",
  "Carpentry",
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand variant="footer" />
            <p>
              Pakistan&apos;s verified skilled artisans network.
              <br />
              Hire with confidence.
            </p>
          </div>
          <div>
            <h3>Popular Services</h3>
            {services.map((service) => (
              <Link key={service} href={`/services#${service.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                {service}
              </Link>
            ))}
            <Link href="/services" style={{ fontWeight: 600, color: "var(--forest)" }}>
              View All Services →
            </Link>
          </div>
          <div>
            <h3>Discover ProLink</h3>
            <Link href="/services">All Services</Link>
            <Link href="/features">Features</Link>
            <Link href="/about">About Us</Link>
            <Link href="/faqs">FAQs</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/sign-in">Sign In</Link>
          </div>
          <div>
            <h3>Active Hubs</h3>
            {["Lahore"].map((city) => (
              <span key={city}>{city}</span>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ProLink.</span>
          <span>English (Pakistan) · PKR (Rs)</span>
        </div>
      </div>
    </footer>
  );
}
