import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Brand } from "./brand";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const featuredCategories = siteConfig.categories.slice(0, 4);

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand variant="footer" />
            <p>
              Local skilled professionals in {siteConfig.city}, in one place.
              <br />
              Compare itemised offers and hire with clarity.
            </p>
          </div>
          <div>
            <h3>Popular Services</h3>
            <div className="footer-link-list">
              {featuredCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={category.href}
                  className="footer-link"
                >
                  {category.name}
                </Link>
              ))}
              <Link href="/services" className="footer-link font-bold">
                View All Services <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div>
            <h3>Discover ProLink</h3>
            <div className="footer-link-list">
              <Link href="/services" className="footer-link">
                All Services
              </Link>
              <Link href="/features" className="footer-link">
                Features
              </Link>
              <Link href="/about" className="footer-link">
                About Us
              </Link>
              <Link href="/faqs" className="footer-link">
                FAQs
              </Link>
              <Link href="/contact" className="footer-link">
                Contact Us
              </Link>
              <Link href="/sign-in" className="footer-link">
                Sign In
              </Link>
            </div>
          </div>
          <div>
            <h3>Active Hub</h3>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-[var(--on-dark)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--leaf)]" aria-hidden="true" />
              <span>{siteConfig.city}</span>
            </div>
          </div>
        </div>

        <div className="footer-disclosure" role="note">
          {siteConfig.disclosure}
        </div>

        <div className="footer-bottom">
          <span>© 2026 {siteConfig.name}.</span>
          <span>English (Pakistan) · PKR (Rs)</span>
        </div>
      </div>
    </footer>
  );
}
