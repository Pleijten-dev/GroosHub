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

  const t = {
    nl: {
      selectCategory: 'Selecteer categorie...',
      selectMaterial: 'Selecteer materiaal...',
      loading: 'Laden...',
      noMaterials: 'Geen materialen gevonden',
      airCavity: 'Luchtspouw / Luchtlaag',
      airCavityNote: 'Geen materiaal nodig'
    },
    en: {
      selectCategory: 'Select category...',
      selectMaterial: 'Select material...',
      loading: 'Loading...',
      noMaterials: 'No materials found',
      airCavity: 'Air Cavity / Air Gap',
      airCavityNote: 'No material needed'
    }
  };

  const translations = t[locale];

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch materials when category changes
  useEffect(() => {
    if (selectedCat) {
      fetchMaterials(selectedCat);
    } else {
      setMaterials([]);
    }
  }, [selectedCat]);

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
      onSelect(materialId, selectedCat, name);
    }
  };

  return (
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
          <option value="AIR_CAVITY">🌬️ {translations.airCavity}</option>
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
  );
}
