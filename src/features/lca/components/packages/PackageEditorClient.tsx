'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CreatePackageInput,
  CreatePackageLayerInput,
  ElementCategory,
  ConstructionSystem,
  InsulationLevel
} from '@/features/lca/types';
import LayerEditorList from './LayerEditorList';
import SectionView from './SectionView';

interface PackageEditorClientProps {
  locale: 'nl' | 'en';
  packageId: string; // 'new' or UUID
}

interface LayerData {
  id: string; // temp ID for UI
  position: number;
  material_id: string;
  material_name?: string;
  material_category?: string;
  thickness: number;
  coverage: number;
  layer_function?: string;
  notes?: string;
}

interface ApiLayerResponse {
  position: number;
  material_id: string;
  thickness: number;
  coverage?: number;
  layer_function?: string;
  notes?: string;
  material?: {
    name_nl?: string;
    name_en?: string;
    category?: string;
  };
}

export default function PackageEditorClient({ locale, packageId }: PackageEditorClientProps) {
  const router = useRouter();
  const isNew = packageId === 'new';

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: ElementCategory;
    subcategory: string;
    construction_system: string;
    insulation_level: string;
    is_public: boolean;
    tags: string[];
  }>({
    name: '',
    description: '',
    category: 'exterior_wall',
    subcategory: '',
    construction_system: '',
    insulation_level: '',
    is_public: false,
    tags: []
  });

  const [layers, setLayers] = useState<LayerData[]>([]);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    nl: {
      title: isNew ? 'Nieuw Pakket' : 'Pakket Bewerken',
      back: 'Terug',
      save: 'Opslaan',
      saving: 'Opslaan...',
      name: 'Naam',
      namePlaceholder: 'Bijv. Houtskelet RC 5.0 - Houten gevelbekleding',
      description: 'Beschrijving',
      descriptionPlaceholder: 'Beschrijf dit pakket...',
      category: 'Categorie',
      subcategory: 'Subcategorie (optioneel)',
      constructionSystem: 'Bouwsysteem (optioneel)',
      insulationLevel: 'Isolatieniveau (optioneel)',
      isPublic: 'Publiek beschikbaar',
      tags: 'Tags (optioneel)',
      layers: 'Lagen',
      layersDescription: 'Voeg materiaallagen toe van buiten naar binnen',
      categories: {
        exterior_wall: 'Gevel',
        roof: 'Dak',
        floor: 'Vloer',
        windows: 'Kozijnen',
        foundation: 'Fundering'
      },
      errorRequired: 'Dit veld is verplicht',
      errorLoading: 'Fout bij laden van pakket',
      errorSaving: 'Fout bij opslaan van pakket',
      successSaved: 'Pakket opgeslagen!'
    },
    en: {
      title: isNew ? 'New Package' : 'Edit Package',
      back: 'Back',
      save: 'Save',
      saving: 'Saving...',
      name: 'Name',
      namePlaceholder: 'E.g. Timber Frame RC 5.0 - Wooden Cladding',
      description: 'Description',
      descriptionPlaceholder: 'Describe this package...',
      category: 'Category',
      subcategory: 'Subcategory (optional)',
      constructionSystem: 'Construction System (optional)',
      insulationLevel: 'Insulation Level (optional)',
      isPublic: 'Public',
      tags: 'Tags (optional)',
      layers: 'Layers',
      layersDescription: 'Add material layers from outside to inside',
      categories: {
        exterior_wall: 'Exterior Wall',
        roof: 'Roof',
        floor: 'Floor',
        windows: 'Windows',
        foundation: 'Foundation'
      },
      errorRequired: 'This field is required',
      errorLoading: 'Error loading package',
      errorSaving: 'Error saving package',
      successSaved: 'Package saved!'
    }
  };

  const translations = t[locale];

  useEffect(() => {
    if (!isNew) {
      fetchPackage();
    }
  }, [packageId]);

  const fetchPackage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/lca/packages/${packageId}`);
      const result = await response.json();

      if (result.success && result.data.package) {
        const pkg = result.data.package;
        setFormData({
          name: pkg.name,
          description: pkg.description || '',
          category: pkg.category,
          subcategory: pkg.subcategory || '',
          construction_system: pkg.construction_system || '',
          insulation_level: pkg.insulation_level || '',
          is_public: pkg.is_public,
          tags: pkg.tags || []
        });

        if (pkg.layers && pkg.layers.length > 0) {
          setLayers(pkg.layers.map((layer: ApiLayerResponse, index: number) => ({
            id: `layer-${index}`,
            position: layer.position,
            material_id: layer.material_id,
            material_name: layer.material?.name_nl || layer.material?.name_en,
            material_category: layer.material?.category,
            thickness: layer.thickness,
            coverage: layer.coverage || 1.0,
            layer_function: layer.layer_function,
            notes: layer.notes
          })));
        }
      } else {
        setError(translations.errorLoading);
      }
    } catch (err) {
      setError(translations.errorLoading);
      console.error('Error fetching package:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || layers.length === 0) {
      setError(translations.errorRequired);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const layersPayload: CreatePackageLayerInput[] = layers.map((layer, index) => ({
        position: index + 1,
        material_id: layer.material_id === 'AIR_CAVITY' ? null : layer.material_id,
        thickness: layer.thickness,
        coverage: layer.coverage,
        layer_function: layer.layer_function || undefined,
        notes: layer.notes || undefined
      }));

      const payload: CreatePackageInput = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        construction_system: (formData.construction_system || undefined) as ConstructionSystem | undefined,
        insulation_level: (formData.insulation_level || undefined) as InsulationLevel | undefined,
        is_public: formData.is_public,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        layers: layersPayload
      };

      const url = isNew ? '/api/lca/packages' : `/api/lca/packages/${packageId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/${locale}/lca/packages`);
      } else {
        setError(result.error || translations.errorSaving);
      }
    } catch (err) {
      setError(translations.errorSaving);
      console.error('Error saving package:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{translations.title}</h1>
        </div>
        <button
          onClick={() => router.back()}
          className="px-lg py-md bg-gray-200 text-gray-700 rounded-base hover:bg-gray-300 transition-colors font-medium"
        >
          {translations.back}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-base py-md rounded-base">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-lg">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-xs">
            {translations.name} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={translations.namePlaceholder}
            className="w-full px-md py-sm border border-gray-300 rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-xs">
            {translations.description}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={translations.descriptionPlaceholder}
            rows={3}
            className="w-full px-md py-sm border border-gray-300 rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-xs">
            {translations.category} *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ElementCategory })}
            className="w-full px-md py-sm border border-gray-300 rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
          >
            {Object.entries(translations.categories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Construction System */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-xs">
            {translations.constructionSystem}
          </label>
          <input
            type="text"
            value={formData.construction_system}
            onChange={(e) => setFormData({ ...formData, construction_system: e.target.value })}
            className="w-full px-md py-sm border border-gray-300 rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Insulation Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-xs">
            {translations.insulationLevel}
          </label>
          <input
            type="text"
            value={formData.insulation_level}
            onChange={(e) => setFormData({ ...formData, insulation_level: e.target.value })}
            className="w-full px-md py-sm border border-gray-300 rounded-base focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Is Public */}
        <div className="flex items-center gap-md">
          <input
            type="checkbox"
            id="is_public"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
            {translations.isPublic}
          </label>
        </div>
      </div>

      {/* Layer Editor with Visual Section */}
      <div className="bg-white rounded-base shadow-md p-lg">
        <div className="mb-base">
          <h2 className="text-xl font-semibold text-gray-900">{translations.layers} *</h2>
          <p className="text-sm text-gray-600 mt-xs">{translations.layersDescription}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          {/* Left: Layer Editor */}
          <div>
            <LayerEditorList
              layers={layers}
              setLayers={setLayers}
              locale={locale}
            />
          </div>

          {/* Right: Visual Section */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="mb-sm">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'nl' ? 'Doorsnede' : 'Cross-section'}
              </h3>
              <p className="text-xs text-gray-600 mt-xs">
                {locale === 'nl'
                  ? 'Architectonische tekening met Nederlandse arceringen'
                  : 'Architectural drawing with Dutch hatching patterns'}
              </p>
            </div>
            <SectionView
              layers={layers}
              locale={locale}
              width={500}
              maxHeight={700}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-xl py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? translations.saving : translations.save}
        </button>
      </div>
    </div>
  );
}
