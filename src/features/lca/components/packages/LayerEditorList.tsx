'use client';

import MaterialSelector from './MaterialSelector';

interface LayerData {
  id: string;
  position: number;
  material_id: string;
  material_name?: string;
  material_category?: string;
  thickness: number;
  coverage: number;
  layer_function?: string;
  notes?: string;
}

interface LayerEditorListProps {
  layers: LayerData[];
  setLayers: (layers: LayerData[]) => void;
  locale: 'nl' | 'en';
}

export default function LayerEditorList({ layers, setLayers, locale }: LayerEditorListProps) {
  const t = {
    nl: {
      addLayer: 'Laag toevoegen',
      addAbove: 'Toevoegen boven',
      addBelow: 'Toevoegen onder',
      remove: 'Verwijderen',
      thickness: 'Dikte (mm)',
      coverage: 'Dekking (%)',
      selectMaterial: 'Selecteer materiaal...',
      noLayers: 'Geen lagen toegevoegd. Klik op "Laag toevoegen" om te beginnen.'
    },
    en: {
      addLayer: 'Add Layer',
      addAbove: 'Add Above',
      addBelow: 'Add Below',
      remove: 'Remove',
      thickness: 'Thickness (mm)',
      coverage: 'Coverage (%)',
      selectMaterial: 'Select material...',
      noLayers: 'No layers added. Click "Add Layer" to get started.'
    }
  };

  const translations = t[locale];

  const addLayer = (position?: number) => {
    const newLayer: LayerData = {
      id: `layer-${Date.now()}`,
      position: position !== undefined ? position : layers.length + 1,
      material_id: '',
      thickness: 0.1,
      coverage: 1.0
    };

    if (position !== undefined) {
      // Insert at specific position
      const newLayers = [
        ...layers.slice(0, position),
        newLayer,
        ...layers.slice(position)
      ];
      // Update positions
      setLayers(newLayers.map((l, i) => ({ ...l, position: i + 1 })));
    } else {
      // Add to end
      setLayers([...layers, newLayer]);
    }
  };

  const removeLayer = (id: string) => {
    const newLayers = layers.filter(l => l.id !== id);
    // Update positions
    setLayers(newLayers.map((l, i) => ({ ...l, position: i + 1 })));
  };

  const updateLayer = (id: string, updates: Partial<LayerData>) => {
    setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  return (
    <div className="space-y-md">
      {layers.length === 0 ? (
        <div className="text-center py-xl border-2 border-dashed border-gray-300 rounded-base">
          <p className="text-gray-600 mb-base">{translations.noLayers}</p>
          <button
            onClick={() => addLayer()}
            className="px-lg py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium"
          >
            {translations.addLayer}
          </button>
        </div>
      ) : (
        <>
          {layers.map((layer, index) => (
            <div key={layer.id} className="space-y-sm">
              {/* Add Above Button */}
              <button
                onClick={() => addLayer(index)}
                className="w-full py-xs text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-sm transition-colors font-medium"
              >
                + {translations.addAbove}
              </button>

              {/* Layer Card */}
              <div className="border border-gray-300 rounded-base p-md bg-gray-50">
                <div className="flex items-start gap-md">
                  {/* Position Badge */}
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-medium text-sm">
                    {index + 1}
                  </div>

                  {/* Layer Content */}
                  <div className="flex-1 space-y-md">
                    {/* Material Selector */}
                    <MaterialSelector
                      selectedMaterialId={layer.material_id}
                      selectedCategory={layer.material_category}
                      onSelect={(materialId, category, name) => {
                        updateLayer(layer.id, {
                          material_id: materialId,
                          material_category: category,
                          material_name: name
                        });
                      }}
                      locale={locale}
                    />

                    {/* Thickness and Coverage */}
                    <div className="grid grid-cols-2 gap-md">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-xs">
                          {translations.thickness}
                        </label>
                        <input
                          type="number"
                          value={Math.round(layer.thickness * 1000)}
                          onChange={(e) => updateLayer(layer.id, {
                            thickness: parseFloat(e.target.value) / 1000
                          })}
                          min="0"
                          step="1"
                          className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-xs">
                          {translations.coverage}
                        </label>
                        <input
                          type="number"
                          value={Math.round(layer.coverage * 100)}
                          onChange={(e) => updateLayer(layer.id, {
                            coverage: parseFloat(e.target.value) / 100
                          })}
                          min="0"
                          max="100"
                          step="1"
                          className="w-full px-sm py-xs border border-gray-300 rounded-sm text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="flex-shrink-0 p-sm text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                    title={translations.remove}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Add Below Button (only for last item) */}
              {index === layers.length - 1 && (
                <button
                  onClick={() => addLayer()}
                  className="w-full py-xs text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded-sm transition-colors font-medium"
                >
                  + {translations.addBelow}
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
