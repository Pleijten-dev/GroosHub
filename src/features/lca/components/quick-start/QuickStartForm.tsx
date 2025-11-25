// ============================================
// QUICK START FORM COMPONENT
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface QuickStartFormProps {
  locale: 'nl' | 'en';
}

interface FormData {
  name: string;
  buildingType: 'vrijstaand' | 'rijwoning' | 'appartement' | 'tussenwoning' | 'hoekwoning';
  constructionSystem: 'houtskelet' | 'metselwerk' | 'beton' | 'clt';
  grossFloorArea: number;
  floors: number;
  insulationLevel: 'RC 3.5' | 'RC 5.0' | 'RC 6.0' | 'RC 8.0' | 'passief';
  location: string;
}

export function QuickStartForm({ locale }: QuickStartFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    buildingType: 'vrijstaand',
    constructionSystem: 'houtskelet',
    grossFloorArea: 120,
    floors: 2,
    insulationLevel: 'RC 6.0',
    location: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/lca/projects/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          gross_floor_area: formData.grossFloorArea,
          building_type: formData.buildingType,
          construction_system: formData.constructionSystem,
          insulation_level: formData.insulationLevel,
          floors: formData.floors,
          location: formData.location || null
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

        {/* Building Type */}
        <div>
          <label htmlFor="buildingType" className="block text-sm font-medium text-gray-700 mb-sm">
            {t.buildingType} <span className="text-red-500">*</span>
          </label>
          <select
            id="buildingType"
            required
            value={formData.buildingType}
            onChange={(e) => setFormData({ ...formData, buildingType: e.target.value as FormData['buildingType'] })}
            className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="vrijstaand">{t.vrijstaand}</option>
            <option value="rijwoning">{t.rijwoning}</option>
            <option value="tussenwoning">{t.tussenwoning}</option>
            <option value="hoekwoning">{t.hoekwoning}</option>
            <option value="appartement">{t.appartement}</option>
          </select>
        </div>

        {/* Construction System */}
        <div>
          <label htmlFor="constructionSystem" className="block text-sm font-medium text-gray-700 mb-sm">
            {t.constructionSystem} <span className="text-red-500">*</span>
          </label>
          <select
            id="constructionSystem"
            required
            value={formData.constructionSystem}
            onChange={(e) => setFormData({ ...formData, constructionSystem: e.target.value as FormData['constructionSystem'] })}
            className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="houtskelet">{t.houtskelet}</option>
            <option value="clt">{t.clt}</option>
            <option value="metselwerk">{t.metselwerk}</option>
            <option value="beton">{t.beton}</option>
          </select>
        </div>

        {/* Insulation Level */}
        <div>
          <label htmlFor="insulationLevel" className="block text-sm font-medium text-gray-700 mb-sm">
            {t.insulationLevel} <span className="text-red-500">*</span>
          </label>
          <select
            id="insulationLevel"
            required
            value={formData.insulationLevel}
            onChange={(e) => setFormData({ ...formData, insulationLevel: e.target.value as FormData['insulationLevel'] })}
            className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="RC 3.5">RC 3.5 ({t.basicInsulation})</option>
            <option value="RC 5.0">RC 5.0 ({t.goodInsulation})</option>
            <option value="RC 6.0">RC 6.0 ({t.veryGoodInsulation})</option>
            <option value="RC 8.0">RC 8.0 ({t.excellentInsulation})</option>
            <option value="passief">{t.passive}</option>
          </select>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-base">
          {/* Gross Floor Area */}
          <div>
            <label htmlFor="grossFloorArea" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.grossFloorArea} (m²) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="grossFloorArea"
              required
              min="20"
              max="10000"
              value={formData.grossFloorArea}
              onChange={(e) => setFormData({ ...formData, grossFloorArea: parseInt(e.target.value) })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
              max="10"
              value={formData.floors}
              onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) })}
              className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
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

        {/* Error Message */}
        {error && (
          <div className="p-base bg-red-50 border border-red-200 rounded-base text-red-700">
            <p className="font-medium">{t.error}</p>
            <p className="text-sm mt-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
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
            disabled={isSubmitting}
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
    projectName: 'Projectnaam',
    projectNamePlaceholder: 'Bijv. Woningbouw Dorpstraat 12',
    buildingType: 'Woningtype',
    vrijstaand: 'Vrijstaande woning',
    rijwoning: 'Rijwoning',
    tussenwoning: 'Tussenwoning',
    hoekwoning: 'Hoekwoning',
    appartement: 'Appartement',
    constructionSystem: 'Bouwsysteem',
    houtskelet: 'Houtskeletbouw',
    clt: 'CLT / Massief hout',
    metselwerk: 'Metselwerk',
    beton: 'Beton',
    insulationLevel: 'Isolatieniveau',
    basicInsulation: 'basis',
    goodInsulation: 'goed',
    veryGoodInsulation: 'zeer goed',
    excellentInsulation: 'uitstekend',
    passive: 'Passiefhuis',
    grossFloorArea: 'Gebruiksoppervlakte',
    floors: 'Aantal bouwlagen',
    location: 'Locatie',
    optional: 'optioneel',
    locationPlaceholder: 'Bijv. Amsterdam, Utrecht',
    error: 'Fout bij aanmaken project',
    cancel: 'Annuleren',
    createProject: 'Project aanmaken',
    creating: 'Bezig met aanmaken...'
  } : {
    projectName: 'Project Name',
    projectNamePlaceholder: 'E.g. Residential Building Main Street 12',
    buildingType: 'Building Type',
    vrijstaand: 'Detached House',
    rijwoning: 'Terraced House',
    tussenwoning: 'Mid-terraced House',
    hoekwoning: 'End-terraced House',
    appartement: 'Apartment',
    constructionSystem: 'Construction System',
    houtskelet: 'Timber Frame',
    clt: 'CLT / Mass Timber',
    metselwerk: 'Masonry',
    beton: 'Concrete',
    insulationLevel: 'Insulation Level',
    basicInsulation: 'basic',
    goodInsulation: 'good',
    veryGoodInsulation: 'very good',
    excellentInsulation: 'excellent',
    passive: 'Passive House',
    grossFloorArea: 'Gross Floor Area',
    floors: 'Number of Floors',
    location: 'Location',
    optional: 'optional',
    locationPlaceholder: 'E.g. Amsterdam, Utrecht',
    error: 'Error creating project',
    cancel: 'Cancel',
    createProject: 'Create Project',
    creating: 'Creating...'
  };
}

export default QuickStartForm;
