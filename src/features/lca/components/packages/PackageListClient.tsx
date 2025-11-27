'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LCAPackage } from '@/features/lca/types';

interface PackageListClientProps {
  locale: 'nl' | 'en';
}

interface PackageWithCount extends LCAPackage {
  layer_count: number;
}

export default function PackageListClient({ locale }: PackageListClientProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    nl: {
      title: 'LCA Pakketten',
      subtitle: 'Beheer uw bouwkundige pakketten',
      newPackage: 'Nieuw Pakket',
      edit: 'Bewerken',
      delete: 'Verwijderen',
      layers: 'lagen',
      thickness: 'Dikte',
      loading: 'Laden...',
      noPackages: 'Geen pakketten gevonden',
      createFirst: 'Maak uw eerste pakket aan',
      confirmDelete: 'Weet u zeker dat u dit pakket wilt verwijderen?',
      categories: {
        exterior_wall: 'Gevel',
        roof: 'Dak',
        floor: 'Vloer',
        windows: 'Kozijnen',
        foundation: 'Fundering'
      }
    },
    en: {
      title: 'LCA Packages',
      subtitle: 'Manage your building assembly packages',
      newPackage: 'New Package',
      edit: 'Edit',
      delete: 'Delete',
      layers: 'layers',
      thickness: 'Thickness',
      loading: 'Loading...',
      noPackages: 'No packages found',
      createFirst: 'Create your first package',
      confirmDelete: 'Are you sure you want to delete this package?',
      categories: {
        exterior_wall: 'Exterior Wall',
        roof: 'Roof',
        floor: 'Floor',
        windows: 'Windows',
        foundation: 'Foundation'
      }
    }
  };

  const translations = t[locale];

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/lca/packages');
      const result = await response.json();

      if (result.success) {
        setPackages(result.data.packages);
      } else {
        setError(result.error || 'Failed to fetch packages');
      }
    } catch (err) {
      setError('Network error');
      console.error('Error fetching packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(translations.confirmDelete)) return;

    try {
      const response = await fetch(`/api/lca/packages/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPackages(packages.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting package:', err);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/${locale}/lca/packages/${id}`);
  };

  const handleNew = () => {
    router.push(`/${locale}/lca/packages/new`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600">{translations.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{translations.title}</h1>
          <p className="text-base text-gray-600 mt-sm">{translations.subtitle}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-lg py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium"
        >
          {translations.newPackage}
        </button>
      </div>

      {/* Package Grid */}
      {packages.length === 0 ? (
        <div className="text-center py-4xl">
          <p className="text-xl text-gray-600 mb-base">{translations.noPackages}</p>
          <button
            onClick={handleNew}
            className="px-xl py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium"
          >
            {translations.createFirst}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-base">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-base shadow-md p-base hover:shadow-lg transition-shadow border border-gray-200"
            >
              {/* Package Header */}
              <div className="mb-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-xs">
                  {pkg.name}
                </h3>
                <span className="inline-block px-sm py-xs bg-primary/10 text-primary text-xs rounded-sm">
                  {translations.categories[pkg.category as keyof typeof translations.categories] || pkg.category}
                </span>
              </div>

              {/* Package Details */}
              {pkg.description && (
                <p className="text-sm text-gray-600 mb-md line-clamp-2">
                  {pkg.description}
                </p>
              )}

              <div className="flex items-center gap-lg text-sm text-gray-700 mb-md">
                <div className="flex items-center gap-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>{pkg.layer_count} {translations.layers}</span>
                </div>
                {pkg.total_thickness && (
                  <div className="flex items-center gap-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span>{Math.round(pkg.total_thickness * 1000)} mm</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-sm pt-md border-t border-gray-200">
                <button
                  onClick={() => handleEdit(pkg.id)}
                  className="flex-1 px-md py-sm bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  {translations.edit}
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="px-md py-sm bg-red-50 text-red-600 rounded-sm hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  {translations.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
