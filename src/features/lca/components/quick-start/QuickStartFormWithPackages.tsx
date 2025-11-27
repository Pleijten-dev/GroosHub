// ============================================
// QUICK START FORM COMPONENT WITH PACKAGE SELECTION
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PackageWithLayers } from '@/features/lca/types';

export interface QuickStartFormProps {
  locale: 'nl' | 'en';
}

interface FormData {
  name: string;
  grossFloorArea: number;
  floors: number;
  dwellingCount: number;
  location: string;
  constructionSystem: 'houtskelet' | 'metselwerk' | 'beton' | 'clt';
  studyPeriod: number;
  // Package selections
  exteriorWallPackage: string;
  roofPackage: string;
  floorPackage: string;
  windowsPackage: string;
  foundationPackage: string;
}

export function QuickStartFormWithPackages({ locale }: QuickStartFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    grossFloorArea: 120,
    floors: 2,
    dwellingCount: 1,
    location: '',
    constructionSystem: 'houtskelet',
    studyPeriod: 75,
    exteriorWallPackage: '',
    roofPackage: '',
    floorPackage: '',
    windowsPackage: '',
    foundationPackage: ''
  });

  const [packages, setPackages] = useState<{
    exterior_wall: PackageWithLayers[];
    roof: PackageWithLayers[];
    floor: PackageWithLayers[];
    windows: PackageWithLayers[];
    foundation: PackageWithLayers[];
  } | null>(null);

  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setIsLoadingPackages(true);
    try {
      const response = await fetch(
        `/api/lca/packages/for-quick-start?construction_system=${formData.constructionSystem}`
      );
      const result = await response.json();

      if (result.success) {
        setPackages(result.data);

        // Auto-select first package in each category if available
        setFormData(prev => ({
          ...prev,
          exteriorWallPackage: result.data.exterior_wall[0]?.id || '',
          roofPackage: result.data.roof[0]?.id || '',
          floorPackage: result.data.floor[0]?.id || '',
          windowsPackage: result.data.windows[0]?.id || '',
          foundationPackage: result.data.foundation[0]?.id || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setError(locale === 'nl' ? 'Kon pakketten niet laden' : 'Could not load packages');
    } finally {
      setIsLoadingPackages(false);
    }
  }, [formData.constructionSystem, locale]);

  // Fetch packages when construction system changes
  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate package selections
    if (!formData.exteriorWallPackage || !formData.roofPackage || !formData.floorPackage ||
        !formData.windowsPackage || !formData.foundationPackage) {
      setError(locale === 'nl'
        ? 'Selecteer een pakket voor alle categorieën'
        : 'Please select a package for all categories'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/lca/projects/quick-create-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          gross_floor_area: formData.grossFloorArea,
          floors: formData.floors,
          dwelling_count: formData.dwellingCount,
          location: formData.location || null,
          construction_system: formData.constructionSystem,
          study_period: formData.studyPeriod,
          // Package selections
          packages: {
            exterior_wall: formData.exteriorWallPackage,
            roof: formData.roofPackage,
            floor: formData.floorPackage,
            windows: formData.windowsPackage,
            foundation: formData.foundationPackage
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create project');
      }

      // Redirect to results page
      const projectId = result.data.project.id;
      router.push(`/${locale}/lca/results/${projectId}`);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = getTranslations(locale);

  return (
    <div className="bg-white p-2xl rounded-lg border border-gray-200 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-xl">
        {/* BASISGEGEVENS */}
        <div className="space-y-base">
          <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">{t.basicInfo}</h2>

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.projectName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t.projectNamePlaceholder}
            />
          </div>

          {/* Gross Floor Area */}
          <div>
            <label htmlFor="grossFloorArea" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.grossFloorArea} (m²) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-base">
              <input
                type="number"
                id="grossFloorArea"
                required
                min="1"
                value={formData.grossFloorArea}
                onChange={(e) => setFormData({ ...formData, grossFloorArea: parseInt(e.target.value) || 0 })}
                className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm text-gray-500">m²</span>
            </div>
          </div>

          {/* Floors */}
          <div>
            <label htmlFor="floors" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.floors} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="floors"
              required
              min="1"
              value={formData.floors}
              onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) || 1 })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Dwelling Count */}
          <div>
            <label htmlFor="dwellingCount" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.dwellingCount} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="dwellingCount"
              required
              min="1"
              value={formData.dwellingCount}
              onChange={(e) => setFormData({ ...formData, dwellingCount: parseInt(e.target.value) || 1 })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Location (Optional) */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.location} <span className="text-gray-400">({t.optional})</span>
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t.locationPlaceholder}
            />
          </div>

          {/* Study Period */}
          <div>
            <label htmlFor="studyPeriod" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.studyPeriod} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.studyPeriodTooltip}>ⓘ</span>
            </label>
            <div className="flex items-center gap-base">
              <input
                type="number"
                id="studyPeriod"
                required
                min="1"
                value={formData.studyPeriod}
                onChange={(e) => setFormData({ ...formData, studyPeriod: parseInt(e.target.value) || 75 })}
                className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm text-gray-500">{t.years}</span>
            </div>
            <p className="text-xs text-gray-500 mt-sm">{t.mpgStandard}</p>
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* CONSTRUCTION SYSTEM SELECTION */}
        <div className="space-y-base">
          <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">{t.construction}</h2>

          {/* Construction System */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-sm">
              {t.constructionSystem} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.constructionSystemTooltip}>ⓘ</span>
            </label>
            <div className="space-y-sm">
              {(['houtskelet', 'clt', 'metselwerk', 'beton'] as const).map((system) => (
                <label key={system} className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="radio"
                    name="constructionSystem"
                    value={system}
                    checked={formData.constructionSystem === system}
                    onChange={(e) => setFormData({ ...formData, constructionSystem: e.target.value as FormData['constructionSystem'] })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t[system]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200"></div>

        {/* PACKAGE SELECTIONS */}
        <div className="space-y-base">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">{t.packageSelection}</h2>
            {isLoadingPackages && (
              <span className="text-sm text-gray-500">{t.loadingPackages}</span>
            )}
          </div>

          <p className="text-sm text-gray-600">{t.packageSelectionInfo}</p>

          {packages && (
            <div className="space-y-base">
              {/* Exterior Wall Package */}
              <div>
                <label htmlFor="exteriorWall" className="block text-sm font-medium text-gray-700 mb-sm">
                  {t.exteriorWall} <span className="text-red-500">*</span>
                </label>
                <select
                  id="exteriorWall"
                  required
                  value={formData.exteriorWallPackage}
                  onChange={(e) => setFormData({ ...formData, exteriorWallPackage: e.target.value })}
                  className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.selectPackage}</option>
                  {packages.exterior_wall.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.layer_count} {t.layers}, {((pkg.total_thickness || 0) * 1000).toFixed(0)}mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Roof Package */}
              <div>
                <label htmlFor="roof" className="block text-sm font-medium text-gray-700 mb-sm">
                  {t.roof} <span className="text-red-500">*</span>
                </label>
                <select
                  id="roof"
                  required
                  value={formData.roofPackage}
                  onChange={(e) => setFormData({ ...formData, roofPackage: e.target.value })}
                  className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.selectPackage}</option>
                  {packages.roof.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.layer_count} {t.layers}, {((pkg.total_thickness || 0) * 1000).toFixed(0)}mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Floor Package */}
              <div>
                <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-sm">
                  {t.floor} <span className="text-red-500">*</span>
                </label>
                <select
                  id="floor"
                  required
                  value={formData.floorPackage}
                  onChange={(e) => setFormData({ ...formData, floorPackage: e.target.value })}
                  className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.selectPackage}</option>
                  {packages.floor.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.layer_count} {t.layers}, {((pkg.total_thickness || 0) * 1000).toFixed(0)}mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Windows Package */}
              <div>
                <label htmlFor="windows" className="block text-sm font-medium text-gray-700 mb-sm">
                  {t.windows} <span className="text-red-500">*</span>
                </label>
                <select
                  id="windows"
                  required
                  value={formData.windowsPackage}
                  onChange={(e) => setFormData({ ...formData, windowsPackage: e.target.value })}
                  className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.selectPackage}</option>
                  {packages.windows.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.layer_count} {t.layers})
                    </option>
                  ))}
                </select>
              </div>

              {/* Foundation Package */}
              <div>
                <label htmlFor="foundation" className="block text-sm font-medium text-gray-700 mb-sm">
                  {t.foundation} <span className="text-red-500">*</span>
                </label>
                <select
                  id="foundation"
                  required
                  value={formData.foundationPackage}
                  onChange={(e) => setFormData({ ...formData, foundationPackage: e.target.value })}
                  className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t.selectPackage}</option>
                  {packages.foundation.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.layer_count} {t.layers}, {((pkg.total_thickness || 0) * 1000).toFixed(0)}mm)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200"></div>

        {/* Estimated Time */}
        <div className="flex items-center justify-center gap-sm text-sm text-gray-600 bg-blue-50 p-base rounded-base">
          <span className="text-lg">💡</span>
          <span>{t.estimatedTime}</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-base bg-red-50 border border-red-200 rounded-base text-red-700">
            <p className="font-medium">{t.error}</p>
            <p className="text-sm mt-sm">{error}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-base pt-base border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-lg py-sm border border-gray-300 rounded-base text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingPackages}
            className="px-lg py-sm bg-primary text-white rounded-base hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? t.creating : t.createProject}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Get translations for the form
 */
function getTranslations(locale: 'nl' | 'en') {
  return locale === 'nl' ? {
    // Sections
    basicInfo: 'Basisgegevens',
    construction: 'Constructie',
    packageSelection: 'Pakket Selectie',

    // Basic Info
    projectName: 'Projectnaam',
    projectNamePlaceholder: 'Bijv. Woningbouw Dorpstraat 12',
    grossFloorArea: 'Brutovloeroppervlakte',
    floors: 'Aantal bouwlagen',
    dwellingCount: 'Aantal woningen',
    location: 'Locatie',
    optional: 'optioneel',
    locationPlaceholder: 'Bijv. Amsterdam, Utrecht',

    // Construction System
    constructionSystem: 'Bouwsysteem',
    constructionSystemTooltip: 'Primaire draagconstructie van het gebouw',
    houtskelet: 'Houtskeletbouw',
    clt: 'CLT / Massief hout',
    metselwerk: 'Metselwerk',
    beton: 'Beton',

    // Study Period
    studyPeriod: 'Studieperiode',
    studyPeriodTooltip: 'Periode waarover de milieu-impact wordt berekend',
    years: 'jaar',
    mpgStandard: '(standaard MPG methodologie)',

    // Package Selection
    packageSelectionInfo: 'Selecteer voorgedefinieerde bouwpakketten voor uw project. De pakketten zijn afgestemd op het gekozen bouwsysteem.',
    loadingPackages: 'Pakketten laden...',
    selectPackage: 'Selecteer een pakket...',
    layers: 'lagen',
    exteriorWall: 'Gevel (buitenmuur)',
    roof: 'Dak',
    floor: 'Vloer',
    windows: 'Kozijnen en beglazing',
    foundation: 'Fundering',

    // Misc
    estimatedTime: 'Geschatte invultijd: 5 minuten',

    // Actions
    error: 'Fout bij aanmaken project',
    cancel: 'Annuleren',
    createProject: 'Project aanmaken',
    creating: 'Bezig met aanmaken...'
  } : {
    // Sections
    basicInfo: 'Basic Information',
    construction: 'Construction',
    packageSelection: 'Package Selection',

    // Basic Info
    projectName: 'Project Name',
    projectNamePlaceholder: 'E.g. Residential Building Main Street 12',
    grossFloorArea: 'Gross Floor Area',
    floors: 'Number of Floors',
    dwellingCount: 'Number of Dwellings',
    location: 'Location',
    optional: 'optional',
    locationPlaceholder: 'E.g. Amsterdam, Utrecht',

    // Construction System
    constructionSystem: 'Construction System',
    constructionSystemTooltip: 'Primary load-bearing structure of the building',
    houtskelet: 'Timber Frame',
    clt: 'CLT / Mass Timber',
    metselwerk: 'Masonry',
    beton: 'Concrete',

    // Study Period
    studyPeriod: 'Study Period',
    studyPeriodTooltip: 'Period over which environmental impact is calculated',
    years: 'years',
    mpgStandard: '(standard MPG methodology)',

    // Package Selection
    packageSelectionInfo: 'Select predefined building packages for your project. Packages are matched to your chosen construction system.',
    loadingPackages: 'Loading packages...',
    selectPackage: 'Select a package...',
    layers: 'layers',
    exteriorWall: 'Exterior Wall',
    roof: 'Roof',
    floor: 'Floor',
    windows: 'Windows & Glazing',
    foundation: 'Foundation',

    // Misc
    estimatedTime: 'Estimated completion time: 5 minutes',

    // Actions
    error: 'Error creating project',
    cancel: 'Cancel',
    createProject: 'Create Project',
    creating: 'Creating...'
  };
}

export default QuickStartFormWithPackages;
