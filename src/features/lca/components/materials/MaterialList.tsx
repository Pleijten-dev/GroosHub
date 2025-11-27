'use client';

import { useState, useEffect } from 'react';

interface Material {
  id: string;
  name_nl: string;
  name_en: string | null;
  category: string;
  gwp_a1_a3: number;
  declared_unit: string;
  dutch_availability: boolean;
  is_verified: boolean;
  quality_rating: number;
}

interface MaterialListProps {
  locale: 'nl' | 'en';
  refreshTrigger: number;
}

export default function MaterialList({ locale, refreshTrigger }: MaterialListProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const translations = {
    nl: {
      title: 'Materialen Overzicht',
      search: 'Zoeken...',
      filterCategory: 'Filter op categorie',
      allCategories: 'Alle categorieën',
      loading: 'Laden...',
      noMaterials: 'Geen materialen gevonden',
      name: 'Naam',
      category: 'Categorie',
      gwp: 'GWP A1-A3',
      unit: 'Eenheid',
      availability: 'NL Beschikbaar',
      verified: 'Geverifieerd',
      quality: 'Kwaliteit',
      yes: 'Ja',
      no: 'Nee'
    },
    en: {
      title: 'Materials Overview',
      search: 'Search...',
      filterCategory: 'Filter by category',
      allCategories: 'All categories',
      loading: 'Loading...',
      noMaterials: 'No materials found',
      name: 'Name',
      category: 'Category',
      gwp: 'GWP A1-A3',
      unit: 'Unit',
      availability: 'NL Available',
      verified: 'Verified',
      quality: 'Quality',
      yes: 'Yes',
      no: 'No'
    }
  };

  const t = translations[locale];

  useEffect(() => {
    fetchMaterials();
  }, [refreshTrigger]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/lca/materials?limit=1000');
      const result = await response.json();

      if (result.success && result.data.materials) {
        setMaterials(result.data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMaterials = materials.filter(mat => {
    const matchesSearch = search === '' ||
      (mat.name_nl?.toLowerCase().includes(search.toLowerCase())) ||
      (mat.name_en?.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === '' || mat.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(materials.map(m => m.category))).sort();

  if (isLoading) {
    return <div className="text-center py-lg">{t.loading}</div>;
  }

  return (
    <div className="space-y-md">
      {/* Filters */}
      <div className="bg-white rounded-base shadow-md p-md flex gap-md">
        <input
          type="text"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-md py-sm border border-gray-300 rounded-base"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-md py-sm border border-gray-300 rounded-base"
        >
          <option value="">{t.allCategories}</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-base shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-md py-sm text-left text-xs font-medium text-gray-700 uppercase">{t.name}</th>
                <th className="px-md py-sm text-left text-xs font-medium text-gray-700 uppercase">{t.category}</th>
                <th className="px-md py-sm text-left text-xs font-medium text-gray-700 uppercase">{t.gwp}</th>
                <th className="px-md py-sm text-left text-xs font-medium text-gray-700 uppercase">{t.unit}</th>
                <th className="px-md py-sm text-center text-xs font-medium text-gray-700 uppercase">{t.availability}</th>
                <th className="px-md py-sm text-center text-xs font-medium text-gray-700 uppercase">{t.verified}</th>
                <th className="px-md py-sm text-center text-xs font-medium text-gray-700 uppercase">{t.quality}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-md py-lg text-center text-gray-500">
                    {t.noMaterials}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(mat => (
                  <tr key={mat.id} className="hover:bg-gray-50">
                    <td className="px-md py-sm text-sm text-gray-900">
                      {locale === 'nl' ? mat.name_nl : (mat.name_en || mat.name_nl)}
                    </td>
                    <td className="px-md py-sm text-sm text-gray-600">{mat.category}</td>
                    <td className="px-md py-sm text-sm text-gray-900 font-mono">
                      {mat.gwp_a1_a3.toFixed(3)}
                    </td>
                    <td className="px-md py-sm text-sm text-gray-600">{mat.declared_unit}</td>
                    <td className="px-md py-sm text-sm text-center">
                      {mat.dutch_availability ? (
                        <span className="text-green-600">{t.yes}</span>
                      ) : (
                        <span className="text-gray-400">{t.no}</span>
                      )}
                    </td>
                    <td className="px-md py-sm text-sm text-center">
                      {mat.is_verified ? (
                        <span className="text-blue-600">✓</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-md py-sm text-sm text-center font-medium">
                      {mat.quality_rating}/5
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600">
        {filteredMaterials.length} {locale === 'nl' ? 'materialen' : 'materials'} ({materials.length} total)
      </div>
    </div>
  );
}
