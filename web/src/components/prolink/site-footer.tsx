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
              <Link key={service} href="/#services">
                {service}
              </Link>
            ))}
          </div>
          <div>
            <h3>Discover ProLink</h3>
            <Link href="/#how-it-works">How It Works</Link>
            <Link href="/#trust">Trust & Safety</Link>
            <Link href="/faqs">FAQs</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/sign-in">Sign In</Link>
          </div>
          <div>
            <h3>Active Hubs</h3>
            {["Islamabad", "Lahore", "Karachi", "Rawalpindi"].map((city) => (
              <span key={city}>{city}</span>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ProLink Technologies Pakistan (Pvt) Ltd.</span>
          <span>English (Pakistan) · PKR (Rs)</span>
        </div>
      </div>
    </footer>
  );
}
