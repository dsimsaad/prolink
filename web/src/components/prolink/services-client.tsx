"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "./brand";

export interface ServiceDetail {
  id: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  description: string;
  rating: number;
  reviewCount: number;
  verifiedProsCount: number;
  typesOfServices: string[];
}

export const allServicesData: ServiceDetail[] = [
  {
    id: "electrical",
    slug: "electrical",
    title: "Electrical Services",
    category: "Electrical",
    image: "/images/services/electrical.jpg",
    description:
      "Licensed and audited electricians for domestic wiring, short circuit diagnostics, solar setups, and appliance power distribution.",
    rating: 4.92,
    reviewCount: 1420,
    verifiedProsCount: 185,
    typesOfServices: [
      "Complete House Concealed Wiring & Load Balancing",
      "Circuit Breaker Tripping, Short-Circuit & DB Box Fixes",
      "Solar Inverter, Battery & UPS System Installation",
      "Ceiling Fan, Chandelier & Smart Lighting Fitting",
      "Electric Motor & Generator Auto-Changeover Switches",
      "Socket, Switchboard & Ground Earthing Diagnostics",
    ],
  },
  {
    id: "plumbing",
    slug: "plumbing",
    title: "Plumbing & Sanitary",
    category: "Plumbing",
    image: "/images/services/plumbing.jpg",
    description:
      "Certified plumbers providing swift leak detection, pipe replacements, bathroom fixture fitting, and water pump installations.",
    rating: 4.95,
    reviewCount: 1890,
    verifiedProsCount: 210,
    typesOfServices: [
      "Underground & Concealed Pipe Leakage Detection",
      "Bathroom Sanitary Ware, Commode & Faucet Installation",
      "Water Tank (Overhead/Underground) Motor Pump Setup",
      "Drain Cleaning, Main Sewer Line & Sink Unclogging",
      "Instant / Gas Geyser Installation, Repair & Flushing",
      "PPRC, CPVC Pipeline Fitting & Water Pressure Boosters",
    ],
  },
  {
    id: "ac-repair",
    slug: "ac-repair-hvac",
    title: "AC Repair & HVAC",
    category: "HVAC",
    image: "/images/services/ac-repair.jpg",
    description:
      "Master HVAC technicians for split, inverter, floor-standing, and central AC maintenance, chemical wash, and refrigerant recharge.",
    rating: 4.94,
    reviewCount: 2340,
    verifiedProsCount: 195,
    typesOfServices: [
      "AC General Service & High-Pressure Chemical Wash",
      "Inverter PCB Circuit Board Diagnostic & Repair",
      "R410a / R32 Refrigerant Gas Refilling & Leak Proofing",
      "New Split AC Installation, Dismantling & Relocation",
      "Compressor Replacement, Starting Capacitor & Fan Motor",
      "Heating / Cooling HVAC Duct Servicing & Filter Changes",
    ],
  },
  {
    id: "carpentry",
    slug: "carpentry",
    title: "Carpentry & Woodwork",
    category: "Carpentry",
    image: "/images/services/carpentry.jpg",
    description:
      "Master wood craftsmen for bespoke furniture, kitchen cabinetry, door locks, hinges, and premium lacquer polishing.",
    rating: 4.89,
    reviewCount: 980,
    verifiedProsCount: 120,
    typesOfServices: [
      "Custom Modular Kitchen Cabinets & Wardrobe Fitting",
      "Door Lock Replacement, Hinges & Sliding Track Repairs",
      "Wooden Furniture Repair, Lacquer & Deco Polish",
      "Wooden Flooring, Skirting & Decking Installation",
      "Custom Beds, Dining Tables & Bookshelf Construction",
      "Gypsum Board Partitions, False Ceilings & Paneling",
    ],
  },
  {
    id: "appliance-repair",
    slug: "appliance-repair",
    title: "Appliance Repair",
    category: "Appliances",
    image: "/images/services/appliance-repair.jpg",
    description:
      "Expert doorstep diagnostics and repair for automatic washing machines, refrigerators, microwaves, and water dispensers with genuine parts.",
    rating: 4.91,
    reviewCount: 1150,
    verifiedProsCount: 140,
    typesOfServices: [
      "Automatic & Front-Load Washing Machine Motor & Drum Repair",
      "Refrigerator, Deep Freezer & Chiller Compressor Replacement",
      "Microwave & Electric Oven Magnetron / Heating Element Fix",
      "Water Dispenser Cooling Compressor & Hot Tank Servicing",
      "LED / Smart TV Wall Mounting & Circuit Board Repair",
      "Kitchen Range Hood, Exhaust Fan & Chimney Motor Servicing",
    ],
  },
  {
    id: "deep-cleaning",
    slug: "deep-cleaning",
    title: "Deep Cleaning & Sanitization",
    category: "Cleaning",
    image: "/images/services/deep-cleaning.jpg",
    description:
      "Comprehensive, hospital-grade deep cleaning solutions for residential homes, corporate offices, post-renovation sites, and carpets.",
    rating: 4.96,
    reviewCount: 1640,
    verifiedProsCount: 160,
    typesOfServices: [
      "Full House & Apartment Deep Scrubbing & Sanitization",
      "Sofa, Mattress & Carpet Vacuum & Steam Extraction",
      "Kitchen Degreasing, Cabinet Interior & Countertop Detailing",
      "Bathroom Tile Descaling, Grout Acid Wash & Disinfection",
      "Post-Construction Paint Stain Removal & Debris Clearing",
      "Water Tank Scrubbing & Exterior Glass Pressure Washing",
    ],
  },
  {
    id: "painting",
    slug: "painting-polish",
    title: "Painting & Polish",
    category: "Painting",
    image: "/images/services/painting.jpg",
    description:
      "Professional interior and exterior painting services using high-grade emulsion, weather-proof coatings, and specialized seepage treatments.",
    rating: 4.90,
    reviewCount: 820,
    verifiedProsCount: 105,
    typesOfServices: [
      "Interior Velvet Finish, Matt & Plastic Emulsion Painting",
      "Exterior Weather-Resistant & Acrylic Shield Paint",
      "Wall Seepage Treatment, Plaster Putty & Crack Filling",
      "Furniture Wood Lacquer, High Gloss & Matt Deco Polish",
      "Feature Accent Walls, Textured Paint & Designer Stencils",
      "Roof Heat-Proofing & Waterproofing Membrane Application",
    ],
  },
  {
    id: "home-tutoring",
    slug: "home-tutoring",
    title: "Home Tutoring & Academic Coaching",
    category: "Tutoring",
    image: "/images/services/home-tutoring.jpg",
    description:
      "Background-checked academic tutors offering personalized one-on-one coaching for school, Matric/FSc, Cambridge O/A Levels, and tests.",
    rating: 4.93,
    reviewCount: 650,
    verifiedProsCount: 95,
    typesOfServices: [
      "Primary & Secondary School All-Subjects Home Coaching",
      "Matric & Intermediate (FSc/ICS) Board Exam Preparation",
      "Cambridge O-Levels & A-Levels (Math, Sciences, Commerce)",
      "Computer Science, Programming & STEM Mentorship",
      "English Language Proficiency, IELTS & Spoken Practice",
      "Quran Tajweed, Nazra & Islamic Studies Guidance",
    ],
  },
  {
    id: "pest-control",
    slug: "pest-control",
    title: "Pest Control & Fumigation",
    category: "Pest Control",
    image: "/images/services/pest-control.jpg",
    description:
      "Certified and odorless pest elimination services targeting termites, bed bugs, cockroaches, and rodents with warranty protection.",
    rating: 4.88,
    reviewCount: 710,
    verifiedProsCount: 80,
    typesOfServices: [
      "Termite (Deemak) Pre & Post-Construction Soil Injections",
      "Bed Bug Thermal & Chemical Eradication Treatments",
      "Cockroach Gel Baiting & Cabinet Disinfection",
      "Mosquito & Dengue Preventive Thermal Fogging",
      "Rodent & Rat Proofing, Trapping & Exclusion Measures",
      "Full Property Antimicrobial Disinfection Misting",
    ],
  },
  {
    id: "movers-packers",
    slug: "movers-packers",
    title: "Movers & Packers",
    category: "Movers",
    image: "/images/services/movers-packers.jpg",
    description:
      "Reliable and secure moving solutions with multi-layer packing, containerized transportation, and professional furniture handling.",
    rating: 4.92,
    reviewCount: 890,
    verifiedProsCount: 110,
    typesOfServices: [
      "Complete House & Apartment Shifting Services",
      "Fragile Crockery & Electronics Multi-Layer Bubble Packing",
      "Heavy Furniture Dismantling, Wrapping & Reassembly",
      "Office Relocation, Computer Workstations & File Moving",
      "Covered Container Fleet Transport with Trained Handlers",
      "Intercity Safe Shifting Across Major Hubs in Pakistan",
    ],
  },
];

const categoryTabs = [
  "All",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Carpentry",
  "Appliances",
  "Cleaning",
  "Painting",
  "Tutoring",
  "Pest Control",
  "Movers",
];

export function ServicesClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = useMemo(() => {
    return allServicesData.filter((service) => {
      const matchesCategory =
        selectedCategory === "All" || service.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesTitle = service.title.toLowerCase().includes(q);
      const matchesDesc = service.description.toLowerCase().includes(q);
      const matchesSubServices = service.typesOfServices.some((sub) =>
        sub.toLowerCase().includes(q)
      );

      return matchesCategory && (matchesTitle || matchesDesc || matchesSubServices);
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="services-content-wrapper">
      <section className="services-hero">
        <div className="container">
          <span className="services-hero-badge">
            <Icon name="shield" />
            Pakistan&apos;s Audited Skilled Artisans Directory
          </span>
          <h1>All Professional Services</h1>
          <p>
            Explore our comprehensive range of on-demand home and commercial
            services. Every service is fulfilled by biometric-verified tradespeople,
            backed by transparent pricing and escrow payment protection.
          </p>

          <div className="services-search-bar">
            <svg
              className="services-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="services-search-input"
              placeholder="Search by service or specific task (e.g. AC chemical wash, pipe leak, solar...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
            />
          </div>

          <div className="services-category-tabs" role="tablist">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                className={`services-tab-btn ${
                  selectedCategory === cat ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="services-main-container">
        <div className="services-meta-header">
          <h2>
            {selectedCategory === "All"
              ? "All Available Services"
              : `${selectedCategory} Services`}
          </h2>
          <span className="services-count-tag">
            Showing {filteredServices.length} of {allServicesData.length} service categories
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="services-empty-state">
            <h3>No services found matching &ldquo;{searchQuery}&rdquo;</h3>
            <p>Try searching with another keyword or reset the category filter.</p>
            <button
              type="button"
              className="button small"
              style={{ marginTop: "16px" }}
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="services-grid-layout">
            {filteredServices.map((service) => (
              <article
                key={service.id}
                id={service.id}
                className="service-card-item"
              >
                {/* Image above the service */}
                <div className="service-image-container">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="service-card-image"
                  />
                  <div className="service-image-overlay" />
                  <span className="service-pill-tag">{service.category}</span>
                  <div className="service-rating-badge">
                    <Icon name="star" className="gold" />
                    <span>{service.rating}</span>
                    <span style={{ opacity: 0.8 }}>({service.reviewCount})</span>
                  </div>
                </div>

                <div className="service-card-body">
                  <h3 className="service-card-title">{service.title}</h3>
                  <p className="service-card-desc">{service.description}</p>

                  {/* Type of services provided */}
                  <div className="service-types-section">
                    <span className="service-types-heading">
                      <Icon name="check" />
                      Type of Services Provided:
                    </span>
                    <ul className="service-types-list">
                      {service.typesOfServices.map((type, idx) => (
                        <li key={idx} className="service-type-item">
                          <svg
                            className="service-check-icon"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="service-card-footer">
                    <div className="service-trust-features">
                      <span className="service-trust-item">
                        <Icon name="shield" /> {service.verifiedProsCount}+ Verified Pros
                      </span>
                      <span className="service-trust-item">
                        <Icon name="card" /> Escrow Protected
                      </span>
                    </div>
                    <Link
                      href={`/sign-in?service=${encodeURIComponent(service.title)}`}
                      className="service-cta-btn"
                    >
                      <span>Book Service</span>
                      <Icon name="arrow" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom Banner */}
        <div className="services-help-banner">
          <div>
            <h3>Need a custom job or emergency assistance?</h3>
            <p>
              Can&apos;t find the specific trade or have a unique home repair
              inquiry? Post a custom job description and receive itemized offers
              from local artisans within minutes.
            </p>
          </div>
          <div className="services-help-actions">
            <Link href="/sign-in" className="button">
              Post a Custom Job <Icon name="arrow" />
            </Link>
            <Link href="/contact" className="button outline">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
