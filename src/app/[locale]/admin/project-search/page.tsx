// src/app/[locale]/admin/project-search/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { AddressAutocomplete } from '@/features/location/components/AddressAutocomplete/AddressAutocomplete';
import { Button } from '@/shared/components/UI';
import { cn } from '@/shared/utils/cn';

/**
 * Project data structure returned from the search API
 */
export interface ProjectData {
  id: string;
  name: string;
  address: string;
  type: string;
  numberOfHouses?: number;
  image?: string;
  url: string;
  description?: string;
  features?: string[];
  developer?: string;
  completionYear?: number;
}

interface ProjectSearchPageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Admin Project Search Page
 * Test page for discovering residential/architectural projects based on location
 */
const ProjectSearchPage: React.FC<ProjectSearchPageProps> = ({ params }) => {
  const [locale, setLocale] = useState<Locale>('nl');
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Resolve params on mount
  useEffect(() => {
    params.then(({ locale: resolvedLocale }) => {
      setLocale(resolvedLocale);
    });
  }, [params]);

  /**
   * Handle address search submission
   */
  const handleSearch = async () => {
    if (!address.trim()) {
      setError(locale === 'nl' ? 'Voer een adres in' : 'Please enter an address');
      return;
    }

    setIsSearching(true);
    setError(null);
    setProjects([]);

    try {
      const response = await fetch('/api/admin/search-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.projects) {
        setProjects(data.projects);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(
        locale === 'nl'
          ? 'Fout bij het zoeken naar projecten'
          : 'Error searching for projects'
      );
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle Enter key press in address input
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-lg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-lg">
          <h1 className="text-4xl font-bold text-text-primary mb-sm">
            {locale === 'nl' ? 'Project Zoeken (Admin Test)' : 'Project Search (Admin Test)'}
          </h1>
          <p className="text-text-secondary">
            {locale === 'nl'
              ? 'Zoek naar recente en geplande bouwprojecten op basis van locatie'
              : 'Search for recent and planned construction projects based on location'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-base mb-lg">
          <div className="flex gap-sm items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale === 'nl' ? 'Adres' : 'Address'}
              </label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={setAddress}
                onKeyPress={handleKeyPress}
                placeholder={
                  locale === 'nl'
                    ? 'Voer een adres in...'
                    : 'Enter an address...'
                }
                disabled={isSearching}
                className="w-full"
              />
            </div>
            <div className="pt-[28px]">
              <Button
                onClick={handleSearch}
                disabled={isSearching || !address.trim()}
                className="px-lg py-sm"
              >
                {isSearching
                  ? locale === 'nl'
                    ? 'Zoeken...'
                    : 'Searching...'
                  : locale === 'nl'
                  ? 'Zoeken'
                  : 'Search'}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-base mb-lg">
            <div className="flex items-center gap-sm">
              <span className="text-red-600 text-xl">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-4xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-base"></div>
            <p className="text-text-secondary">
              {locale === 'nl'
                ? 'Projecten zoeken...'
                : 'Searching for projects...'}
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!isSearching && projects.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-base">
              {locale === 'nl'
                ? `${projects.length} Project${projects.length !== 1 ? 'en' : ''} Gevonden`
                : `${projects.length} Project${projects.length !== 1 ? 's' : ''} Found`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-base">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isSearching && !error && projects.length === 0 && address && (
          <div className="flex flex-col items-center justify-center py-4xl">
            <div className="text-6xl mb-base">🏗️</div>
            <h3 className="text-xl font-semibold text-text-primary mb-sm">
              {locale === 'nl' ? 'Geen Projecten Gevonden' : 'No Projects Found'}
            </h3>
            <p className="text-text-secondary text-center max-w-md">
              {locale === 'nl'
                ? 'Probeer een ander adres of een grotere zoekradius'
                : 'Try a different address or larger search radius'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Project Card Component
 */
interface ProjectCardProps {
  project: ProjectData;
  locale: Locale;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, locale }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Project Image */}
      {project.image ? (
        <div className="relative h-48 bg-gray-200">
          <img
            src={project.image}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-6xl">🏢</div>
        </div>
      )}

      {/* Project Info */}
      <div className="p-base">
        <h3 className="text-lg font-bold text-text-primary mb-sm line-clamp-2">
          {project.name}
        </h3>

        <div className="space-y-2 text-sm mb-base">
          {/* Address */}
          <div className="flex items-start gap-2">
            <span className="text-gray-500">📍</span>
            <p className="text-gray-700 flex-1 line-clamp-2">{project.address}</p>
          </div>

          {/* Type */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">🏠</span>
            <p className="text-gray-700">{project.type}</p>
          </div>

          {/* Number of Houses */}
          {project.numberOfHouses && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">🔢</span>
              <p className="text-gray-700">
                {project.numberOfHouses}{' '}
                {locale === 'nl' ? 'woningen' : 'units'}
              </p>
            </div>
          )}

          {/* Developer */}
          {project.developer && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">🏗️</span>
              <p className="text-gray-700 line-clamp-1">{project.developer}</p>
            </div>
          )}

          {/* Completion Year */}
          {project.completionYear && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📅</span>
              <p className="text-gray-700">{project.completionYear}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-600 mb-base line-clamp-3">
            {project.description}
          </p>
        )}

        {/* Features */}
        {project.features && project.features.length > 0 && (
          <div className="mb-base">
            <div className="flex flex-wrap gap-2">
              {project.features.slice(0, 3).map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {feature}
                </span>
              ))}
              {project.features.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  +{project.features.length - 3} {locale === 'nl' ? 'meer' : 'more'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* View Project Link */}
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          {locale === 'nl' ? 'Bekijk project' : 'View project'}
          <span>→</span>
        </a>
      </div>
    </div>
  );
};

export default ProjectSearchPage;
