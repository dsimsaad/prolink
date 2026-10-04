import React from 'react';
import { ArrowLeft, Compass, Search, Sparkles } from 'lucide-react';
import { useMarketplace, marketplaceStore } from '../../store/marketplaceStore';
import { Button } from '../../components/ui/Button';

interface PlaceholderPageProps {
  title?: string;
  description?: string;
  breadcrumb?: string[];
  type?: 'table' | 'cards' | 'search';
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  breadcrumb,
  type = 'cards'
}) => {
  const { currentRole, currentPath, queryParams } = useMarketplace();

  // If coming from search or category click
  const searchQuery = queryParams['q'] || queryParams['category'] || '';
  const searchCity = queryParams['city'] || 'All Cities';

  const defaultTitle = searchQuery
    ? `Results for "${searchQuery}" in ${searchCity}`
    : title || 'Module Preview';

  const defaultDesc = description || (searchQuery
    ? `Browsing verified, top-rated professionals and custom offers for ${searchQuery} in ${searchCity}.`
    : `This workspace module provides dedicated controls and data for ProLink ${currentRole} operations.`);

  const backLink = currentRole === 'admin'
    ? '/admin/overview'
    : currentRole === 'professional'
    ? '/pro/overview'
    : currentRole === 'customer'
    ? '/customer/overview'
    : '/';

  const displayBreadcrumbs = breadcrumb || [
    'ProLink',
    currentRole.charAt(0).toUpperCase() + currentRole.slice(1),
    defaultTitle
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#6A7B70]">
        {displayBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-[#A3B1A8]">/</span>}
            <span className={idx === displayBreadcrumbs.length - 1 ? 'text-[#0C2A1B] font-semibold' : ''}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Header with Title and Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE8E0]">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0C2A1B] tracking-tight">
            {defaultTitle}
          </h1>
          <p className="text-sm text-[#6A7B70] mt-1 max-w-2xl">
            {defaultDesc}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => marketplaceStore.navigate(backLink)}
          className="self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Overview
        </Button>
      </div>

      {/* Spot Illustration & Note Banner */}
      <div className="p-4 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[10px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E6F4EA] border border-[#CDE9D6] flex items-center justify-center text-[#0F6B3E] shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F6B3E]">Prototype Notice</span>
            <p className="text-sm text-[#0C2A1B] font-medium">
              This module is part of the full ProLink build. Interactive prototype screens are active in Overview, Post a Job, Feed, Active Jobs, and Verification Queue.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => marketplaceStore.navigate(backLink)}
          className="shrink-0 hidden md:inline-flex"
        >
          Return to Overview
        </Button>
      </div>

      {/* Skeleton preview in brand style */}
      {type === 'table' ? (
        <div className="bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden">
          <div className="p-4 border-b border-[#DCE8E0] flex items-center justify-between bg-[#F4FAF6]/50">
            <div className="h-4 w-40 bg-[#E6F4EA] rounded animate-pulse" />
            <div className="h-8 w-24 bg-white border border-[#DCE8E0] rounded animate-pulse" />
          </div>
          <div className="divide-y divide-[#DCE8E0]">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E6F4EA] animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 bg-[#E6F4EA] rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-[#F4FAF6] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-3.5 w-24 bg-[#E6F4EA] rounded animate-pulse hidden sm:block" />
                <div className="h-6 w-16 bg-[#E6F4EA] rounded-full animate-pulse" />
                <div className="h-3.5 w-16 bg-[#E6F4EA] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((card) => (
            <div
              key={card}
              className="bg-white border border-[#DCE8E0] rounded-[10px] p-5 space-y-4 hover:border-[#A9D3B5] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[8px] bg-[#E6F4EA] border border-[#CDE9D6] flex items-center justify-center text-[#0F6B3E]">
                    <Sparkles className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-[#E6F4EA] rounded animate-pulse" />
                    <div className="h-3 w-16 bg-[#F4FAF6] rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-5 w-14 bg-[#E6F4EA] rounded-full animate-pulse" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-[#F4FAF6] rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-[#F4FAF6] rounded animate-pulse" />
              </div>
              <div className="pt-3 border-t border-[#DCE8E0] flex justify-between items-center">
                <div className="h-4 w-20 bg-[#E6F4EA] rounded animate-pulse" />
                <div className="h-7 w-20 bg-[#0F6B3E]/10 rounded-[6px] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
