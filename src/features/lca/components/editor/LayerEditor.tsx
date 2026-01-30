/**
 * Layer Editor Component
 *
 * Panel for managing material layers within a building element.
 * Features:
 * - Add new layers with material selection
 * - Edit layer thickness and coverage
 * - Drag-and-drop reordering
 * - Delete layers
 * - Real-time GWP calculation display
 *
 * @module features/lca/components/editor
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/components/UI/Button/Button';
import { Modal } from '@/shared/components/UI/Modal/Modal';
import { LayerRow } from './LayerRow';
import { MaterialSelector } from './MaterialSelector';
import { ElementCategoryIcon } from '@/features/lca/components/ui';
import type { ElementWithLayers, LayerWithMaterial, Material, CreateLayerInput, ElementCategory } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LayerEditorProps {
  /** Element with its layers */
  element: ElementWithLayers;
  /** Callback when a layer is added */
  onAddLayer: (data: CreateLayerInput) => Promise<void>;
  /** Callback when a layer is updated */
  onUpdateLayer: (layerId: string, updates: Partial<LayerWithMaterial>) => Promise<void>;
  /** Callback when a layer is deleted */
  onDeleteLayer: (layerId: string) => Promise<void>;
  /** Callback when layers are reordered */
  onReorderLayers: (elementId: string, layerIds: string[]) => Promise<void>;
  /** Callback when element changes should trigger recalculation */
  onRecalculate?: () => void;
  /** Whether the editor is in loading state */
  isLoading?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'Materiaallagen',
    noLayers: 'Geen lagen',
    noLayersDescription: 'Voeg materiaallagen toe aan dit element.',
    addLayer: 'Laag toevoegen',
    addFirstLayer: 'Eerste laag toevoegen',
    totalThickness: 'Totale dikte',
    estimatedGwp: 'Geschatte GWP',
    perM2: 'per m²',
    layerCount: 'lagen',
    layer: 'laag',
    selectMaterial: 'Selecteer materiaal',
    addLayerTitle: 'Nieuwe laag toevoegen',
    thickness: 'Dikte (mm)',
    thicknessPlaceholder: 'bijv. 100',
    coverage: 'Dekking (%)',
    coveragePlaceholder: '100',
    cancel: 'Annuleren',
    add: 'Toevoegen',
    adding: 'Toevoegen...',
    saving: 'Opslaan...',
    deleteConfirm: 'Weet je zeker dat je deze laag wilt verwijderen?',
    elementInfo: 'Element informatie',
    area: 'Oppervlak',
  },
  en: {
    title: 'Material Layers',
    noLayers: 'No layers',
    noLayersDescription: 'Add material layers to this element.',
    addLayer: 'Add Layer',
    addFirstLayer: 'Add First Layer',
    totalThickness: 'Total thickness',
    estimatedGwp: 'Estimated GWP',
    perM2: 'per m²',
    layerCount: 'layers',
    layer: 'layer',
    selectMaterial: 'Select material',
    addLayerTitle: 'Add New Layer',
    thickness: 'Thickness (mm)',
    thicknessPlaceholder: 'e.g., 100',
    coverage: 'Coverage (%)',
    coveragePlaceholder: '100',
    cancel: 'Cancel',
    add: 'Add',
    adding: 'Adding...',
    saving: 'Saving...',
    deleteConfirm: 'Are you sure you want to delete this layer?',
    elementInfo: 'Element information',
    area: 'Area',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total thickness of all layers in mm
 */
function calculateTotalThickness(layers: LayerWithMaterial[]): number {
  return layers.reduce((sum, layer) => sum + (layer.thickness * 1000), 0);
}

/**
 * Estimate total GWP for element based on layers
 * This is a simplified calculation - actual calculation happens on server
 */
function estimateElementGwp(element: ElementWithLayers): number {
  let total = 0;
  for (const layer of element.layers) {
    const material = layer.material;
    // Simplified calculation: GWP per kg * density * thickness * area * coverage
    const density = material.density || 1000; // Default 1000 kg/m³
    const mass = density * layer.thickness * element.quantity * layer.coverage;
    const gwpPerKg = material.gwp_a1_a3 / (material.conversion_to_kg || 1);
    total += mass * gwpPerKg;
  }
  return total;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Layer Editor Component
 *
 * @example
 * ```tsx
 * <LayerEditor
 *   element={selectedElement}
 *   onAddLayer={handleAddLayer}
 *   onUpdateLayer={handleUpdateLayer}
 *   onDeleteLayer={handleDeleteLayer}
 *   onReorderLayers={handleReorderLayers}
 *   locale="nl"
 * />
 * ```
 */
export function LayerEditor({
  element,
  onAddLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorderLayers,
  onRecalculate,
  isLoading = false,
  locale = 'nl',
  className,
}: LayerEditorProps) {
  const t = TRANSLATIONS[locale];

  // ============================================
  // STATE
  // ============================================

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [newLayerThickness, setNewLayerThickness] = useState('100');
  const [newLayerCoverage, setNewLayerCoverage] = useState('100');
  const [isAdding, setIsAdding] = useState(false);
  const [changingMaterialLayerId, setChangingMaterialLayerId] = useState<string | null>(null);

  // Calculated values
  const totalThickness = calculateTotalThickness(element.layers);
  const estimatedGwp = estimateElementGwp(element);
  const layerCount = element.layers.length;

  // ============================================
  // HANDLERS
  // ============================================

  const handleAddLayer = useCallback(async () => {
    if (!selectedMaterial) return;

    setIsAdding(true);
    try {
      const data: CreateLayerInput = {
        element_id: element.id,
        position: element.layers.length + 1,
        material_id: selectedMaterial.id,
        thickness: parseFloat(newLayerThickness) / 1000, // Convert mm to m
        coverage: parseFloat(newLayerCoverage) / 100, // Convert % to 0-1
      };

      await onAddLayer(data);
      setShowAddModal(false);
      setSelectedMaterial(null);
      setNewLayerThickness('100');
      setNewLayerCoverage('100');
      onRecalculate?.();
    } catch (error) {
      console.error('Error adding layer:', error);
    } finally {
      setIsAdding(false);
    }
  }, [element, selectedMaterial, newLayerThickness, newLayerCoverage, onAddLayer, onRecalculate]);

  const handleThicknessChange = useCallback(async (layerId: string, thickness: number) => {
    try {
      await onUpdateLayer(layerId, { thickness });
      onRecalculate?.();
    } catch (error) {
      console.error('Error updating thickness:', error);
    }
  }, [onUpdateLayer, onRecalculate]);

  const handleCoverageChange = useCallback(async (layerId: string, coverage: number) => {
    try {
      await onUpdateLayer(layerId, { coverage });
      onRecalculate?.();
    } catch (error) {
      console.error('Error updating coverage:', error);
    }
  }, [onUpdateLayer, onRecalculate]);

  const handleDeleteLayer = useCallback(async (layerId: string) => {
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      await onDeleteLayer(layerId);
      onRecalculate?.();
    } catch (error) {
      console.error('Error deleting layer:', error);
    }
  }, [onDeleteLayer, onRecalculate, t.deleteConfirm]);

  const handleChangeMaterial = useCallback((layerId: string) => {
    setChangingMaterialLayerId(layerId);
  }, []);

  const handleMaterialChanged = useCallback(async (material: Material) => {
    if (!changingMaterialLayerId) return;

    try {
      await onUpdateLayer(changingMaterialLayerId, { material_id: material.id } as Partial<LayerWithMaterial>);
      setChangingMaterialLayerId(null);
      onRecalculate?.();
    } catch (error) {
      console.error('Error changing material:', error);
    }
  }, [changingMaterialLayerId, onUpdateLayer, onRecalculate]);

  // Simple drag-and-drop via manual reorder (for full DnD, use react-beautiful-dnd or dnd-kit)
  const handleMoveUp = useCallback(async (index: number) => {
    if (index <= 0) return;
    const newOrder = [...element.layers];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await onReorderLayers(element.id, newOrder.map(l => l.id));
  }, [element, onReorderLayers]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (index >= element.layers.length - 1) return;
    const newOrder = [...element.layers];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await onReorderLayers(element.id, newOrder.map(l => l.id));
  }, [element, onReorderLayers]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn('rounded-lg bg-white shadow', className)}>
      {/* Header with Element Info */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <ElementCategoryIcon
            category={element.category as ElementCategory}
            size="md"
            colorVariant="accent"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{element.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{t.area}: {element.quantity} {element.quantity_unit}</span>
              <span className="text-gray-300">|</span>
              <span>{layerCount} {layerCount === 1 ? t.layer : t.layerCount}</span>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            {t.addLayer}
          </Button>
        </div>

        {/* Summary Stats */}
        {layerCount > 0 && (
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500">{t.totalThickness}</div>
              <div className="text-sm font-semibold text-gray-900">{totalThickness} mm</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t.estimatedGwp}</div>
              <div className="text-sm font-semibold text-gray-900">
                {estimatedGwp.toFixed(0)} kg CO₂-eq
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t.perM2}</div>
              <div className="text-sm font-semibold text-gray-900">
                {(estimatedGwp / element.quantity).toFixed(1)} kg CO₂-eq/m²
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layers List */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : layerCount === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
              </svg>
            </div>
            <h4 className="mb-1 font-medium text-gray-900">{t.noLayers}</h4>
            <p className="mb-4 text-sm text-gray-500">{t.noLayersDescription}</p>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {t.addFirstLayer}
            </Button>
          </div>
        ) : (
          // Layers List
          <div className="space-y-2">
            {element.layers
              .sort((a, b) => a.position - b.position)
              .map((layer, index) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  index={index}
                  onThicknessChange={handleThicknessChange}
                  onCoverageChange={handleCoverageChange}
                  onDelete={handleDeleteLayer}
                  onChangeMaterial={handleChangeMaterial}
                  locale={locale}
                  dragHandleProps={{
                    onDoubleClick: () => {
                      // Double-click to move up
                      handleMoveUp(index);
                    },
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Add Layer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedMaterial(null);
        }}
        title={t.addLayerTitle}
        size="lg"
      >
        <div className="space-y-5">
          {/* Material Selector */}
          <div className="space-y-xs">
            <label className="block text-sm font-medium text-text-primary">
              {t.selectMaterial}
            </label>
            <MaterialSelector
              selectedMaterial={selectedMaterial}
              onSelectMaterial={setSelectedMaterial}
              locale={locale}
            />
          </div>

          {/* Thickness and Coverage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-xs">
              <label className="block text-sm font-medium text-text-primary">
                {t.thickness}
              </label>
              <input
                type="number"
                value={newLayerThickness}
                onChange={(e) => setNewLayerThickness(e.target.value)}
                min={0}
                step={1}
                placeholder={t.thicknessPlaceholder}
                className={cn(
                  'w-full px-md py-sm rounded-base border border-gray-300',
                  'text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
            </div>
            <div className="space-y-xs">
              <label className="block text-sm font-medium text-text-primary">
                {t.coverage}
              </label>
              <input
                type="number"
                value={newLayerCoverage}
                onChange={(e) => setNewLayerCoverage(e.target.value)}
                min={0}
                max={100}
                step={5}
                placeholder={t.coveragePlaceholder}
                className={cn(
                  'w-full px-md py-sm rounded-base border border-gray-300',
                  'text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setSelectedMaterial(null);
              }}
              disabled={isAdding}
            >
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddLayer}
              disabled={!selectedMaterial || isAdding}
              loading={isAdding}
            >
              {isAdding ? t.adding : t.add}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Material Modal */}
      <Modal
        isOpen={!!changingMaterialLayerId}
        onClose={() => setChangingMaterialLayerId(null)}
        title={t.selectMaterial}
        size="lg"
      >
        <div className="space-y-5">
          <MaterialSelector
            selectedMaterial={null}
            onSelectMaterial={(material) => {
              handleMaterialChanged(material);
            }}
            locale={locale}
          />
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setChangingMaterialLayerId(null)}
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

LayerEditor.displayName = 'LayerEditor';

export default LayerEditor;
