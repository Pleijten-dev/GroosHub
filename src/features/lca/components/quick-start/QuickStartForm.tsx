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
  grossFloorArea: number;
  floors: number;
  dwellingCount: number;
  location: string;
  constructionSystem: 'houtskelet' | 'metselwerk' | 'beton' | 'clt';
  facadeCladding: 'hout' | 'vezelcement' | 'metselwerk' | 'metaal' | 'stucwerk';
  foundation: 'kruipruimte' | 'betonplaat' | 'souterrain';
  roof: 'plat_bitumen' | 'hellend_dakpannen' | 'hellend_metaal' | 'groendak';
  windowFrames: 'pvc' | 'hout' | 'aluminium';
  windowToWallRatio: number;
  studyPeriod: number;
}

export function QuickStartForm({ locale }: QuickStartFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    grossFloorArea: 120,
    floors: 2,
    dwellingCount: 1,
    location: '',
    constructionSystem: 'houtskelet',
    facadeCladding: 'hout',
    foundation: 'kruipruimte',
    roof: 'hellend_dakpannen',
    windowFrames: 'pvc',
    windowToWallRatio: 20,
    studyPeriod: 75
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
          floors: formData.floors,
          dwelling_count: formData.dwellingCount,
          location: formData.location || null,
          construction_system: formData.constructionSystem,
          facade_cladding: formData.facadeCladding,
          foundation: formData.foundation,
          roof: formData.roof,
          window_frames: formData.windowFrames,
          window_to_wall_ratio: formData.windowToWallRatio,
          study_period: formData.studyPeriod
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
        </div>

        <div className="border-t border-gray-200"></div>

        {/* WONINGKARAKTERISTIEKEN */}
        <div className="space-y-base">
          <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">{t.dwellingCharacteristics}</h2>

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
        </div>

        <div className="border-t border-gray-200"></div>

        {/* CONSTRUCTIE */}
        <div className="space-y-base">
          <h2 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">{t.construction}</h2>

          {/* Construction System */}
          <div>
            <label htmlFor="constructionSystem" className="block text-sm font-medium text-gray-700 mb-sm">
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

          {/* Facade Cladding */}
          <div>
            <label htmlFor="facadeCladding" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.facadeCladding} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.facadeCladdingTooltip}>ⓘ</span>
              <span className="ml-sm text-xs text-primary font-semibold">{t.new}</span>
            </label>
            <div className="space-y-sm">
              {(['hout', 'vezelcement', 'metselwerk', 'metaal', 'stucwerk'] as const).map((cladding) => (
                <label key={cladding} className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="radio"
                    name="facadeCladding"
                    value={cladding}
                    checked={formData.facadeCladding === cladding}
                    onChange={(e) => setFormData({ ...formData, facadeCladding: e.target.value as FormData['facadeCladding'] })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t[`facade_${cladding}`]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Foundation */}
          <div>
            <label htmlFor="foundation" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.foundation} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.foundationTooltip}>ⓘ</span>
              <span className="ml-sm text-xs text-primary font-semibold">{t.new}</span>
            </label>
            <div className="space-y-sm">
              {(['kruipruimte', 'betonplaat', 'souterrain'] as const).map((found) => (
                <label key={found} className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="radio"
                    name="foundation"
                    value={found}
                    checked={formData.foundation === found}
                    onChange={(e) => setFormData({ ...formData, foundation: e.target.value as FormData['foundation'] })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t[`foundation_${found}`]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Roof */}
          <div>
            <label htmlFor="roof" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.roof} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.roofTooltip}>ⓘ</span>
              <span className="ml-sm text-xs text-primary font-semibold">{t.new}</span>
            </label>
            <div className="space-y-sm">
              {(['plat_bitumen', 'hellend_dakpannen', 'hellend_metaal', 'groendak'] as const).map((roofType) => (
                <label key={roofType} className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="radio"
                    name="roof"
                    value={roofType}
                    checked={formData.roof === roofType}
                    onChange={(e) => setFormData({ ...formData, roof: e.target.value as FormData['roof'] })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t[`roof_${roofType}`]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Window Frames */}
          <div>
            <label htmlFor="windowFrames" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.windowFrames} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.windowFramesTooltip}>ⓘ</span>
              <span className="ml-sm text-xs text-primary font-semibold">{t.new}</span>
            </label>
            <div className="space-y-sm">
              {(['pvc', 'hout', 'aluminium'] as const).map((frame) => (
                <label key={frame} className="flex items-center gap-sm cursor-pointer">
                  <input
                    type="radio"
                    name="windowFrames"
                    value={frame}
                    checked={formData.windowFrames === frame}
                    onChange={(e) => setFormData({ ...formData, windowFrames: e.target.value as FormData['windowFrames'] })}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">{t[`frames_${frame}`]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Window to Wall Ratio */}
          <div>
            <label htmlFor="windowToWallRatio" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.windowToWallRatio} <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-base">
              <input
                type="number"
                id="windowToWallRatio"
                required
                min="0"
                max="100"
                value={formData.windowToWallRatio}
                onChange={(e) => setFormData({ ...formData, windowToWallRatio: parseInt(e.target.value) || 0 })}
                className="w-full px-base py-sm border border-gray-300 rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          {/* Study Period */}
          <div>
            <label htmlFor="studyPeriod" className="block text-sm font-medium text-gray-700 mb-sm">
              {t.studyPeriod} <span className="text-red-500">*</span>
              <span className="ml-sm text-gray-400 cursor-help" title={t.studyPeriodTooltip}>ⓘ</span>
              <span className="ml-sm text-xs text-primary font-semibold">{t.new}</span>
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
    // Sections
    basicInfo: 'Basisgegevens',
    dwellingCharacteristics: 'Woningkarakteristieken',
    construction: 'Constructie',

    // Basic Info
    projectName: 'Projectnaam',
    projectNamePlaceholder: 'Bijv. Woningbouw Dorpstraat 12',
    grossFloorArea: 'Brutovloer oppervlakte',
    floors: 'Aantal bouwlagen',
    location: 'Locatie',
    optional: 'optioneel',
    locationPlaceholder: 'Bijv. Amsterdam, Utrecht',

    // Dwelling Characteristics
    dwellingCount: 'Aantal woningen',

    // Construction System
    constructionSystem: 'Bouwsysteem',
    constructionSystemTooltip: 'Primaire draagconstructie van het gebouw',
    houtskelet: 'Houtskeletbouw',
    clt: 'CLT / Massief hout',
    metselwerk: 'Metselwerk',
    beton: 'Beton',

    // Facade Cladding
    facadeCladding: 'Gevelbekleding',
    facadeCladdingTooltip: 'Afwerklaag aan de buitenzijde van de gevel',
    facade_hout: 'Houtgevelbekleding',
    facade_vezelcement: 'Vezelcement platen',
    facade_metselwerk: 'Metselwerk (baksteen)',
    facade_metaal: 'Metalen gevelpanelen',
    facade_stucwerk: 'Stucwerk',

    // Foundation
    foundation: 'Fundatie',
    foundationTooltip: 'Type fundering onder het gebouw',
    foundation_kruipruimte: 'Kruipruimte',
    foundation_betonplaat: 'Betonplaat op isolatie',
    foundation_souterrain: 'Souterrain/kelder',

    // Roof
    roof: 'Dak',
    roofTooltip: 'Type dakconstructie en afwerking',
    roof_plat_bitumen: 'Plat dak (bitumen/EPDM)',
    roof_hellend_dakpannen: 'Hellend dak (dakpannen)',
    roof_hellend_metaal: 'Hellend dak (metaal)',
    roof_groendak: 'Groendak',

    // Window Frames
    windowFrames: 'Kozijnen',
    windowFramesTooltip: 'Materiaal van de raamkozijnen',
    frames_pvc: 'Kunststof (PVC)',
    frames_hout: 'Hout',
    frames_aluminium: 'Aluminium',

    // Window to Wall Ratio
    windowToWallRatio: 'Open dicht verhouding',

    // Study Period
    studyPeriod: 'Studieperiode',
    studyPeriodTooltip: 'Periode waarover de milieu-impact wordt berekend',
    years: 'jaar',
    mpgStandard: '(standaard MPG methodologie)',

    // Misc
    new: 'NEW!',
    estimatedTime: 'Geschatte invultijd: 7 minuten',

    // Actions
    error: 'Fout bij aanmaken project',
    cancel: 'Annuleren',
    createProject: 'Project aanmaken',
    creating: 'Bezig met aanmaken...'
  } : {
    // Sections
    basicInfo: 'Basic Information',
    dwellingCharacteristics: 'Dwelling Characteristics',
    construction: 'Construction',

    // Basic Info
    projectName: 'Project Name',
    projectNamePlaceholder: 'E.g. Residential Building Main Street 12',
    grossFloorArea: 'Gross Floor Area',
    floors: 'Number of Floors',
    location: 'Location',
    optional: 'optional',
    locationPlaceholder: 'E.g. Amsterdam, Utrecht',

    // Dwelling Characteristics
    dwellingCount: 'Number of Dwellings',

    // Construction System
    constructionSystem: 'Construction System',
    constructionSystemTooltip: 'Primary load-bearing structure of the building',
    houtskelet: 'Timber Frame',
    clt: 'CLT / Mass Timber',
    metselwerk: 'Masonry',
    beton: 'Concrete',

    // Facade Cladding
    facadeCladding: 'Facade Cladding',
    facadeCladdingTooltip: 'Exterior finishing layer of the facade',
    facade_hout: 'Timber Cladding',
    facade_vezelcement: 'Fiber Cement Panels',
    facade_metselwerk: 'Masonry (Brick)',
    facade_metaal: 'Metal Panels',
    facade_stucwerk: 'Render/Stucco',

    // Foundation
    foundation: 'Foundation',
    foundationTooltip: 'Type of foundation under the building',
    foundation_kruipruimte: 'Crawl Space',
    foundation_betonplaat: 'Concrete Slab on Insulation',
    foundation_souterrain: 'Basement',

    // Roof
    roof: 'Roof',
    roofTooltip: 'Type of roof construction and finish',
    roof_plat_bitumen: 'Flat Roof (Bitumen/EPDM)',
    roof_hellend_dakpannen: 'Pitched Roof (Tiles)',
    roof_hellend_metaal: 'Pitched Roof (Metal)',
    roof_groendak: 'Green Roof',

    // Window Frames
    windowFrames: 'Window Frames',
    windowFramesTooltip: 'Material of the window frames',
    frames_pvc: 'PVC',
    frames_hout: 'Timber',
    frames_aluminium: 'Aluminum',

    // Window to Wall Ratio
    windowToWallRatio: 'Window to Wall Ratio',

    // Study Period
    studyPeriod: 'Study Period',
    studyPeriodTooltip: 'Period over which environmental impact is calculated',
    years: 'years',
    mpgStandard: '(standard MPG methodology)',

    // Misc
    new: 'NEW!',
    estimatedTime: 'Estimated completion time: 7 minutes',

    // Actions
    error: 'Error creating project',
    cancel: 'Cancel',
    createProject: 'Create Project',
    creating: 'Creating...'
  };
}

export default QuickStartForm;
