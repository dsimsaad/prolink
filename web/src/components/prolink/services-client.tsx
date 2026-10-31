"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Search } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { siteConfig, type TradeCategory } from "@/config/site";

export const allServicesData: readonly TradeCategory[] = siteConfig.categories;

const categoryTabs = ["All", ...siteConfig.categories.map((cat) => cat.name)];

export function ServicesClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = useMemo(() => {
    return allServicesData.filter((service) => {
      const matchesCategory =
        selectedCategory === "All" || service.name === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesName = service.name.toLowerCase().includes(q);
      const matchesDesc = service.overview.toLowerCase().includes(q);
      const matchesTasks = service.tasks.some((task) =>
        task.toLowerCase().includes(q)
      );

      return matchesCategory && (matchesName || matchesDesc || matchesTasks);
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="services-content-wrapper">
      <section className="services-hero">
        <div className="container">
          <h1>Household Services Directory</h1>
          <p>
            Browse the {siteConfig.categories.length} trade categories available
            in {siteConfig.city}. Post what needs fixing and compare itemised
            offers from local professionals before you decide.
          </p>

          <div className="services-search-bar">
            <Search className="services-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="services-search-input"
              placeholder="Search by trade or household task (e.g. pipe leak, breaker, AC, brick...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
            />
          </div>

          <div className="services-category-tabs" role="tablist" aria-label="Filter by trade category">
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
              ? `All Trade Categories (${siteConfig.city})`
              : selectedCategory}
          </h2>
          <span className="services-count-tag">
            Showing {filteredServices.length} of {allServicesData.length} categories
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="services-empty-state">
            <h3>No categories matched &ldquo;{searchQuery}&rdquo;</h3>
            <p>Try another keyword or reset the category filter to view all trades.</p>
            <button
              type="button"
              className="button small mt-4"
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
                key={service.slug}
                id={service.slug}
                className="service-card-item"
              >
                <div className="service-image-container">
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 1080px) 50vw, 33vw"
                    className="service-card-image"
                  />
                </div>

                <div className="service-card-body">
                  <div className="service-card-header-row">
                    <span className={`icon-tile tile-hue-${service.tileHue}`}>
                      <CategoryIcon iconKey={service.iconKey} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="service-card-title">{service.name}</h3>
                      <span className="service-card-subtitle">
                        {service.shortDescription}
                      </span>
                    </div>
                  </div>

                  <p className="service-card-desc">{service.overview}</p>

                  <div className="service-types-section">
                    <span className="service-types-heading">Common requests</span>
                    <ul className="service-types-list">
                      {service.tasks.map((task) => (
                        <li key={task} className="service-type-item">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--forest)]"
                            aria-hidden="true"
                          />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="service-card-footer">
                    <Link
                      href={`/sign-in?service=${encodeURIComponent(service.name)}`}
                      className="service-cta-btn"
                    >
                      <span>Post a {service.name} Job</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="services-help-banner">
          <div>
            <h3>Not sure which category fits your repair?</h3>
            <p>
              Describe what needs attention when you post a job and local
              professionals in {siteConfig.city} can send itemised offers for
              you to compare.
            </p>
          </div>
          <div className="services-help-actions">
            <Link href="/sign-in" className="button">
              Post a Job <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/contact" className="button outline">
              Ask a Question
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
