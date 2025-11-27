'use client';

import { useState, useEffect } from 'react';

interface Material {
  id: string;
  name_nl: string;
  name_en: string;
  category: string;
}

interface MaterialSelectorProps {
  selectedMaterialId: string;
  selectedCategory?: string;
  onSelect: (materialId: string, category: string, name: string) => void;
  locale: 'nl' | 'en';
}

export default function MaterialSelector({
  selectedMaterialId,
  selectedCategory,
  onSelect,
  locale
}: MaterialSelectorProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedCat, setSelectedCat] = useState(selectedCategory || '');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const t = {
    nl: {
      selectCategory: 'Selecteer categorie...',
      selectMaterial: 'Selecteer materiaal...',
      loading: 'Laden...',
      noMaterials: 'Geen materialen gevonden',
      airCavity: 'Luchtspouw / Luchtlaag',
      airCavityNote: 'Geen materiaal nodig',
      searchPlaceholder: 'Zoek op materiaalnaam...',
      browseMode: 'Blader per categorie',
      searchMode: 'Zoek direct',
      searching: 'Zoeken...'
    },
    en: {
      selectCategory: 'Select category...',
      selectMaterial: 'Select material...',
      loading: 'Loading...',
      noMaterials: 'No materials found',
      airCavity: 'Air Cavity / Air Gap',
      airCavityNote: 'No material needed',
      searchPlaceholder: 'Search by material name...',
      browseMode: 'Browse by category',
      searchMode: 'Search directly',
      searching: 'Searching...'
    }
  };

  const translations = t[locale];

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch materials when category changes
  useEffect(() => {
    if (selectedCat && !searchMode) {
      fetchMaterials(selectedCat);
    } else if (!searchMode) {
      setMaterials([]);
    }
  }, [selectedCat, searchMode]);

  // Search materials when search query changes
  useEffect(() => {
    if (searchMode && searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchMaterials(searchQuery);
      }, 300); // Debounce 300ms
      return () => clearTimeout(timeoutId);
    } else if (searchMode) {
      setMaterials([]);
    }
  }, [searchQuery, searchMode]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await fetch('/api/lca/materials?categories_only=true');
      const result = await response.json();

      if (result.success && result.data.categories) {
        setCategories(result.data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchMaterials = async (category: string) => {
    try {
      setIsLoadingMaterials(true);
      const response = await fetch(`/api/lca/materials?category=${encodeURIComponent(category)}&limit=1000`);
      const result = await response.json();

      if (result.success && result.data.materials) {
        setMaterials(result.data.materials);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const searchMaterials = async (query: string) => {
    try {
      setIsLoadingMaterials(true);
      const response = await fetch(`/api/lca/materials?search=${encodeURIComponent(query)}&limit=100`);
      const result = await response.json();

      if (result.success && result.data.materials) {
        setMaterials(result.data.materials);
      }
    } catch (err) {
      console.error('Error searching materials:', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCat(category);
    // If air cavity selected, immediately set special ID
    if (category === 'AIR_CAVITY') {
      const name = locale === 'nl' ? 'Luchtspouw' : 'Air Cavity';
      onSelect('AIR_CAVITY', category, name);
    } else if (category !== selectedCategory) {
      // Reset material selection when category changes
      onSelect('', category, '');
    }
  };

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    if (material) {
      const name = locale === 'nl' ? material.name_nl : material.name_en;
      // In search mode, use the material's actual category
      const category = searchMode ? material.category : selectedCat;
      onSelect(materialId, category, name);
    }
  };

  return (
    <div className="space-y-md">
      {/* Mode Toggle */}
      <div className="flex gap-xs">
        <button
          type="button"
          onClick={() => {
            setSearchMode(false);
            setSearchQuery('');
            setMaterials([]);
          }}
          className={`flex-1 px-sm py-xs text-xs font-medium rounded-sm transition-colors ${
            !searchMode
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {translations.browseMode}
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchMode(true);
            setSelectedCat('');
            setMaterials([]);
          }}
          className={`flex-1 px-sm py-xs text-xs font-medium rounded-sm transition-colors ${
            searchMode
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {translations.searchMode}
        </button>
      </div>

      {/* Search Mode */}
      {searchMode ? (
        <div className="space-y-md">
          {/* Search Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-xs">
              {translations.searchPlaceholder}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={translations.searchPlaceholder}
              className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Search Results */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-xs">
              {translations.selectMaterial}
            </label>
            <select
              value={selectedMaterialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              disabled={isLoadingMaterials || materials.length === 0}
              className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {isLoadingMaterials
                  ? translations.searching
                  : searchQuery.length < 2
                  ? translations.searchPlaceholder
                  : materials.length === 0
                  ? translations.noMaterials
                  : translations.selectMaterial}
              </option>
              {materials.map(mat => (
                <option key={mat.id} value={mat.id}>
                  {locale === 'nl' ? mat.name_nl : mat.name_en} ({mat.category})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        /* Browse Mode */
        <div className="grid grid-cols-2 gap-md">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-xs">
              {translations.selectCategory}
            </label>
            <select
              value={selectedCat}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={isLoadingCategories}
              className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{translations.selectCategory}</option>
              <option value="AIR_CAVITY">{translations.airCavity}</option>
              <option disabled>────────────────</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Material Dropdown */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-xs">
              {translations.selectMaterial}
            </label>
            {selectedCat === 'AIR_CAVITY' ? (
              <div className="w-full px-sm py-xs border border-gray-200 rounded-sm text-sm bg-gray-50 text-gray-500 italic">
                {translations.airCavityNote}
              </div>
            ) : (
              <select
                value={selectedMaterialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                disabled={!selectedCat || isLoadingMaterials}
                className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingMaterials ? translations.loading : translations.selectMaterial}
                </option>
                {materials.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {locale === 'nl' ? mat.name_nl : mat.name_en}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
