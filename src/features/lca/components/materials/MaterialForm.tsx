'use client';

import { useState } from 'react';
import { z } from 'zod';

interface MaterialFormProps {
  locale: 'nl' | 'en';
  onSuccess: () => void;
}

// Zod validation schema for critical LCA fields
const materialSchema = z.object({
  // Names (at least one required)
  name_nl: z.string().min(1, 'Nederlandse naam is verplicht'),
  name_en: z.string().optional(),
  name_de: z.string().optional(),

  // Classification
  category: z.string().min(1, 'Categorie is verplicht'),
  subcategory: z.string().optional(),
  material_type: z.string().min(1, 'Materiaaltype is verplicht'),

  // Physical properties (at least one required)
  density: z.number().positive().optional(),
  bulk_density: z.number().positive().optional(),
  area_weight: z.number().positive().optional(),
  thermal_conductivity: z.number().positive().optional(),

  // Units and conversion (CRITICAL)
  declared_unit: z.enum(['kg', 'm²', 'm³', 'm', 'piece']),
  conversion_to_kg: z.number().positive('Conversie naar kg is verplicht en moet positief zijn'),

  // LCA A1-A3 (CRITICAL - Production phase)
  gwp_a1_a3: z.number('GWP A1-A3 is verplicht voor LCA'),

  // Optional LCA indicators
  odp_a1_a3: z.number().optional(),
  pocp_a1_a3: z.number().optional(),
  ap_a1_a3: z.number().optional(),
  ep_a1_a3: z.number().optional(),
  adpe_a1_a3: z.number().optional(),
  adpf_a1_a3: z.number().optional(),

  // Lifecycle phases (optional but recommended)
  gwp_a4: z.number().optional(),
  gwp_a5: z.number().optional(),
  gwp_c1: z.number().optional(),
  gwp_c2: z.number().optional(),
  gwp_c3: z.number().optional(),
  gwp_c4: z.number().optional(),
  gwp_d: z.number().optional(),

  // Carbon content
  biogenic_carbon: z.number().optional(),
  fossil_carbon: z.number().optional(),

  // Service life and EOL
  reference_service_life: z.number().int().positive().optional(),
  eol_scenario: z.string().optional(),
  recyclability: z.number().min(0).max(1).optional(),

  // Availability
  region: z.string().min(1, 'Regio is verplicht'),
  dutch_availability: z.boolean(),

  // Metadata
  epd_owner: z.string().optional(),
  epd_url: z.string().url().optional().or(z.literal('')),
  quality_rating: z.number().int().min(1).max(5).default(3),
  is_verified: z.boolean().default(false),
  is_generic: z.boolean().default(false),
  is_public: z.boolean().default(true)
});

type MaterialFormData = z.infer<typeof materialSchema>;

export default function MaterialForm({ locale, onSuccess }: MaterialFormProps) {
  const [formData, setFormData] = useState<Partial<MaterialFormData>>({
    dutch_availability: true,
    quality_rating: 3,
    is_verified: false,
    is_generic: false,
    is_public: true,
    region: 'NL',
    declared_unit: 'kg'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const translations = {
    nl: {
      // Form sections
      basicInfo: 'Basisinformatie',
      names: 'Namen',
      classification: 'Classificatie',
      physicalProps: 'Fysische Eigenschappen',
      lcaData: 'LCA Gegevens (Verplicht)',
      optionalLCA: 'Optionele LCA Gegevens',
      lifecycle: 'Levenscyclus',
      availability: 'Beschikbaarheid',
      metadata: 'Metadata',

      // Fields
      nameNl: 'Nederlandse naam',
      nameEn: 'Engelse naam',
      nameDe: 'Duitse naam',
      category: 'Categorie',
      subcategory: 'Subcategorie',
      materialType: 'Materiaaltype',
      density: 'Dichtheid (kg/m³)',
      bulkDensity: 'Bulk dichtheid (kg/m³)',
      areaWeight: 'Gewicht per m² (kg/m²)',
      thermalConductivity: 'Warmtegeleidingscoëfficiënt (W/mK)',
      declaredUnit: 'Gedeclareerde eenheid',
      conversionToKg: 'Conversie naar kg',
      gwpA1A3: 'GWP A1-A3 (kg CO₂-eq)',
      gwpA4: 'GWP A4 Transport (kg CO₂-eq)',
      gwpA5: 'GWP A5 Installatie (kg CO₂-eq)',
      gwpC1: 'GWP C1 Demontage (kg CO₂-eq)',
      gwpC2: 'GWP C2 Transport (kg CO₂-eq)',
      gwpC3: 'GWP C3 Afvalverwerking (kg CO₂-eq)',
      gwpC4: 'GWP C4 Storten (kg CO₂-eq)',
      gwpD: 'GWP D Hergebruik (kg CO₂-eq)',
      biogenicCarbon: 'Biogene koolstof (kg)',
      fossilCarbon: 'Fossiele koolstof (kg)',
      serviceLife: 'Referentie levensduur (jaren)',
      eolScenario: 'End-of-Life scenario',
      recyclability: 'Recyclebaarheid (0-1)',
      region: 'Regio',
      dutchAvailability: 'Beschikbaar in Nederland',
      epdOwner: 'EPD eigenaar',
      epdUrl: 'EPD URL',
      qualityRating: 'Kwaliteitsbeoordeling (1-5)',
      isVerified: 'Geverifieerd',
      isGeneric: 'Generiek',
      isPublic: 'Publiek beschikbaar',

      // Buttons
      save: 'Materiaal Opslaan',
      saving: 'Opslaan...',
      cancel: 'Annuleren',

      // Help text
      conversionHelp: 'Bijv. voor beton in m³: ~2400 kg/m³',
      gwpHelp: 'Verplicht veld. Global Warming Potential per gedeclareerde eenheid.',
      qualityHelp: '1 = Laag, 5 = Hoog',

      // Errors
      validationError: 'Controleer de formuliervelden',
      saveError: 'Fout bij opslaan materiaal',
      success: 'Materiaal succesvol aangemaakt!'
    },
    en: {
      // Form sections
      basicInfo: 'Basic Information',
      names: 'Names',
      classification: 'Classification',
      physicalProps: 'Physical Properties',
      lcaData: 'LCA Data (Required)',
      optionalLCA: 'Optional LCA Data',
      lifecycle: 'Lifecycle',
      availability: 'Availability',
      metadata: 'Metadata',

      // Fields
      nameNl: 'Dutch name',
      nameEn: 'English name',
      nameDe: 'German name',
      category: 'Category',
      subcategory: 'Subcategory',
      materialType: 'Material type',
      density: 'Density (kg/m³)',
      bulkDensity: 'Bulk density (kg/m³)',
      areaWeight: 'Area weight (kg/m²)',
      thermalConductivity: 'Thermal conductivity (W/mK)',
      declaredUnit: 'Declared unit',
      conversionToKg: 'Conversion to kg',
      gwpA1A3: 'GWP A1-A3 (kg CO₂-eq)',
      gwpA4: 'GWP A4 Transport (kg CO₂-eq)',
      gwpA5: 'GWP A5 Installation (kg CO₂-eq)',
      gwpC1: 'GWP C1 Deconstruction (kg CO₂-eq)',
      gwpC2: 'GWP C2 Transport (kg CO₂-eq)',
      gwpC3: 'GWP C3 Waste processing (kg CO₂-eq)',
      gwpC4: 'GWP C4 Disposal (kg CO₂-eq)',
      gwpD: 'GWP D Reuse (kg CO₂-eq)',
      biogenicCarbon: 'Biogenic carbon (kg)',
      fossilCarbon: 'Fossil carbon (kg)',
      serviceLife: 'Reference service life (years)',
      eolScenario: 'End-of-Life scenario',
      recyclability: 'Recyclability (0-1)',
      region: 'Region',
      dutchAvailability: 'Available in Netherlands',
      epdOwner: 'EPD owner',
      epdUrl: 'EPD URL',
      qualityRating: 'Quality rating (1-5)',
      isVerified: 'Verified',
      isGeneric: 'Generic',
      isPublic: 'Publicly available',

      // Buttons
      save: 'Save Material',
      saving: 'Saving...',
      cancel: 'Cancel',

      // Help text
      conversionHelp: 'E.g. for concrete in m³: ~2400 kg/m³',
      gwpHelp: 'Required field. Global Warming Potential per declared unit.',
      qualityHelp: '1 = Low, 5 = High',

      // Errors
      validationError: 'Please check form fields',
      saveError: 'Error saving material',
      success: 'Material created successfully!'
    }
  };

  const t = translations[locale];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Validate with Zod
    const result = materialSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      setGeneralError(t.validationError);
      return;
    }

    // Save material
    setIsSaving(true);
    try {
      const response = await fetch('/api/lca/materials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data)
      });

      const responseData = await response.json();

      if (responseData.success) {
        alert(t.success);
        onSuccess();
      } else {
        setGeneralError(responseData.error || t.saveError);
      }
    } catch (error) {
      console.error('Error saving material:', error);
      setGeneralError(t.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof MaterialFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-lg">
      {generalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-base py-md rounded-base">
          {generalError}
        </div>
      )}

      {/* Names Section */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.names} *</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.nameNl} *
            </label>
            <input
              type="text"
              value={formData.name_nl || ''}
              onChange={(e) => updateField('name_nl', e.target.value)}
              className={`w-full px-md py-sm border rounded-base ${errors.name_nl ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name_nl && <p className="text-xs text-red-500 mt-xs">{errors.name_nl}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.nameEn}
            </label>
            <input
              type="text"
              value={formData.name_en || ''}
              onChange={(e) => updateField('name_en', e.target.value)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.nameDe}
            </label>
            <input
              type="text"
              value={formData.name_de || ''}
              onChange={(e) => updateField('name_de', e.target.value)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>
        </div>
      </div>

      {/* Classification Section */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.classification} *</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.category} *
            </label>
            <input
              type="text"
              value={formData.category || ''}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="Insulation, Concrete, Timber, etc."
              className={`w-full px-md py-sm border rounded-base ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.category && <p className="text-xs text-red-500 mt-xs">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.subcategory}
            </label>
            <input
              type="text"
              value={formData.subcategory || ''}
              onChange={(e) => updateField('subcategory', e.target.value)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.materialType} *
            </label>
            <input
              type="text"
              value={formData.material_type || ''}
              onChange={(e) => updateField('material_type', e.target.value)}
              className={`w-full px-md py-sm border rounded-base ${errors.material_type ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.material_type && <p className="text-xs text-red-500 mt-xs">{errors.material_type}</p>}
          </div>
        </div>
      </div>

      {/* Physical Properties Section */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.physicalProps}</h2>
        <p className="text-sm text-gray-600">Vul tenminste één eigenschap in / Fill in at least one property</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.density}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.density || ''}
              onChange={(e) => updateField('density', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.bulkDensity}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.bulk_density || ''}
              onChange={(e) => updateField('bulk_density', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.areaWeight}
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.area_weight || ''}
              onChange={(e) => updateField('area_weight', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.thermalConductivity}
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.thermal_conductivity || ''}
              onChange={(e) => updateField('thermal_conductivity', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>
        </div>
      </div>

      {/* Critical LCA Data Section */}
      <div className="bg-green-50 border-2 border-green-400 rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.lcaData}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.declaredUnit} *
            </label>
            <select
              value={formData.declared_unit || 'kg'}
              onChange={(e) => updateField('declared_unit', e.target.value)}
              className={`w-full px-md py-sm border rounded-base ${errors.declared_unit ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="kg">kg</option>
              <option value="m²">m²</option>
              <option value="m³">m³</option>
              <option value="m">m</option>
              <option value="piece">piece</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.conversionToKg} *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.conversion_to_kg || ''}
              onChange={(e) => updateField('conversion_to_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-md py-sm border rounded-base ${errors.conversion_to_kg ? 'border-red-500' : 'border-gray-300'}`}
            />
            <p className="text-xs text-gray-500 mt-xs">{t.conversionHelp}</p>
            {errors.conversion_to_kg && <p className="text-xs text-red-500 mt-xs">{errors.conversion_to_kg}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.gwpA1A3} *
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_a1_a3 !== undefined ? formData.gwp_a1_a3 : ''}
              onChange={(e) => updateField('gwp_a1_a3', e.target.value ? parseFloat(e.target.value) : undefined)}
              className={`w-full px-md py-sm border rounded-base ${errors.gwp_a1_a3 ? 'border-red-500' : 'border-gray-300'}`}
            />
            <p className="text-xs text-gray-500 mt-xs">{t.gwpHelp}</p>
            {errors.gwp_a1_a3 && <p className="text-xs text-red-500 mt-xs">{errors.gwp_a1_a3}</p>}
          </div>
        </div>
      </div>

      {/* Optional LCA Lifecycle Phases */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.lifecycle}</h2>
        <p className="text-sm text-gray-600">Optioneel maar aanbevolen / Optional but recommended</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpA4}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_a4 !== undefined ? formData.gwp_a4 : ''}
              onChange={(e) => updateField('gwp_a4', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpA5}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_a5 !== undefined ? formData.gwp_a5 : ''}
              onChange={(e) => updateField('gwp_a5', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpC1}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_c1 !== undefined ? formData.gwp_c1 : ''}
              onChange={(e) => updateField('gwp_c1', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpC2}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_c2 !== undefined ? formData.gwp_c2 : ''}
              onChange={(e) => updateField('gwp_c2', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpC3}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_c3 !== undefined ? formData.gwp_c3 : ''}
              onChange={(e) => updateField('gwp_c3', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpC4}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_c4 !== undefined ? formData.gwp_c4 : ''}
              onChange={(e) => updateField('gwp_c4', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.gwpD}</label>
            <input
              type="number"
              step="0.001"
              value={formData.gwp_d !== undefined ? formData.gwp_d : ''}
              onChange={(e) => updateField('gwp_d', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">{t.serviceLife}</label>
            <input
              type="number"
              step="1"
              value={formData.reference_service_life || ''}
              onChange={(e) => updateField('reference_service_life', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            />
          </div>
        </div>
      </div>

      {/* Availability and Metadata */}
      <div className="bg-white rounded-base shadow-md p-lg space-y-md">
        <h2 className="text-xl font-semibold text-gray-900">{t.availability}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.region} *
            </label>
            <input
              type="text"
              value={formData.region || ''}
              onChange={(e) => updateField('region', e.target.value)}
              placeholder="NL, EU, Global"
              className={`w-full px-md py-sm border rounded-base ${errors.region ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.region && <p className="text-xs text-red-500 mt-xs">{errors.region}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-xs">
              {t.qualityRating}
            </label>
            <select
              value={formData.quality_rating || 3}
              onChange={(e) => updateField('quality_rating', parseInt(e.target.value))}
              className="w-full px-md py-sm border border-gray-300 rounded-base"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
            <p className="text-xs text-gray-500 mt-xs">{t.qualityHelp}</p>
          </div>

          <div className="flex flex-col gap-sm">
            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={formData.dutch_availability || false}
                onChange={(e) => updateField('dutch_availability', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">{t.dutchAvailability}</span>
            </label>

            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={formData.is_verified || false}
                onChange={(e) => updateField('is_verified', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">{t.isVerified}</span>
            </label>

            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={formData.is_generic || false}
                onChange={(e) => updateField('is_generic', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">{t.isGeneric}</span>
            </label>

            <label className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={formData.is_public || false}
                onChange={(e) => updateField('is_public', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">{t.isPublic}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-md">
        <button
          type="button"
          onClick={onSuccess}
          className="px-xl py-md bg-gray-200 text-gray-700 rounded-base hover:bg-gray-300 transition-colors font-medium"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-xl py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? t.saving : t.save}
        </button>
      </div>
    </form>
  );
}
