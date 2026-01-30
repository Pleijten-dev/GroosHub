/**
 * Element Editor Modal Component
 *
 * Modal for creating and editing building elements in an LCA project.
 * Form fields:
 * - Name (required)
 * - Category (required, select)
 * - Quantity (required, number)
 * - Quantity Unit (select, default m²)
 * - SfB Code (optional)
 * - Description/Notes (optional)
 *
 * @module features/lca/components/editor
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { Modal } from '@/shared/components/UI/Modal/Modal';
import { Input } from '@/shared/components/UI/Input/Input';
import { Button } from '@/shared/components/UI/Button/Button';
import { ElementCategoryIcon } from '@/features/lca/components/ui';
import type { LCAElement, ElementCategory, CreateElementInput } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ElementEditorProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when element is saved */
  onSave: (data: CreateElementInput) => Promise<void>;
  /** Project ID for the new element */
  projectId: string;
  /** Existing element data for editing (undefined for create) */
  element?: LCAElement;
  /** Locale for translations */
  locale?: 'nl' | 'en';
}

interface FormData {
  name: string;
  category: ElementCategory;
  quantity: string;
  quantity_unit: string;
  sfb_code: string;
  description: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    createTitle: 'Nieuw Element',
    editTitle: 'Element Bewerken',
    name: 'Naam',
    namePlaceholder: 'bijv. Buitengevel',
    nameRequired: 'Naam is verplicht',
    category: 'Categorie',
    categoryRequired: 'Categorie is verplicht',
    quantity: 'Hoeveelheid',
    quantityPlaceholder: 'bijv. 150',
    quantityRequired: 'Hoeveelheid is verplicht',
    quantityInvalid: 'Voer een geldig getal in',
    unit: 'Eenheid',
    sfbCode: 'SfB Code',
    sfbCodePlaceholder: 'bijv. 21',
    sfbCodeHelper: 'Optioneel: Nederlandse elementcodering',
    description: 'Omschrijving',
    descriptionPlaceholder: 'Extra notities over dit element...',
    cancel: 'Annuleren',
    save: 'Opslaan',
    create: 'Toevoegen',
    saving: 'Opslaan...',
  },
  en: {
    createTitle: 'New Element',
    editTitle: 'Edit Element',
    name: 'Name',
    namePlaceholder: 'e.g., External Wall',
    nameRequired: 'Name is required',
    category: 'Category',
    categoryRequired: 'Category is required',
    quantity: 'Quantity',
    quantityPlaceholder: 'e.g., 150',
    quantityRequired: 'Quantity is required',
    quantityInvalid: 'Enter a valid number',
    unit: 'Unit',
    sfbCode: 'SfB Code',
    sfbCodePlaceholder: 'e.g., 21',
    sfbCodeHelper: 'Optional: Dutch element coding',
    description: 'Description',
    descriptionPlaceholder: 'Additional notes about this element...',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Add',
    saving: 'Saving...',
  },
};

const ELEMENT_CATEGORIES: { value: ElementCategory; nl: string; en: string }[] = [
  { value: 'exterior_wall', nl: 'Buitenwand', en: 'Exterior Wall' },
  { value: 'interior_wall', nl: 'Binnenwand', en: 'Interior Wall' },
  { value: 'floor', nl: 'Vloer', en: 'Floor' },
  { value: 'roof', nl: 'Dak', en: 'Roof' },
  { value: 'foundation', nl: 'Fundering', en: 'Foundation' },
  { value: 'windows', nl: 'Ramen', en: 'Windows' },
  { value: 'doors', nl: 'Deuren', en: 'Doors' },
  { value: 'mep', nl: 'Installaties', en: 'MEP' },
  { value: 'finishes', nl: 'Afwerking', en: 'Finishes' },
  { value: 'other', nl: 'Overig', en: 'Other' },
];

const QUANTITY_UNITS = [
  { value: 'm²', label: 'm² (vierkante meter)' },
  { value: 'm', label: 'm (meter)' },
  { value: 'm³', label: 'm³ (kubieke meter)' },
  { value: 'st', label: 'st (stuks)' },
  { value: 'kg', label: 'kg (kilogram)' },
];

const INITIAL_FORM_DATA: FormData = {
  name: '',
  category: 'exterior_wall',
  quantity: '',
  quantity_unit: 'm²',
  sfb_code: '',
  description: '',
};

// ============================================
// COMPONENT
// ============================================

/**
 * Element Editor Modal Component
 *
 * @example
 * ```tsx
 * <ElementEditor
 *   isOpen={showEditor}
 *   onClose={() => setShowEditor(false)}
 *   onSave={handleSaveElement}
 *   projectId={projectId}
 *   element={editingElement} // undefined for create
 *   locale="nl"
 * />
 * ```
 */
export function ElementEditor({
  isOpen,
  onClose,
  onSave,
  projectId,
  element,
  locale = 'nl',
}: ElementEditorProps) {
  const t = TRANSLATIONS[locale];
  const isEditing = !!element;

  // ============================================
  // STATE
  // ============================================

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

  // Reset form when modal opens or element changes
  useEffect(() => {
    if (isOpen) {
      if (element) {
        setFormData({
          name: element.name,
          category: element.category as ElementCategory,
          quantity: String(element.quantity),
          quantity_unit: element.quantity_unit,
          sfb_code: element.sfb_code || '',
          description: element.description || '',
        });
      } else {
        setFormData(INITIAL_FORM_DATA);
      }
      setErrors({});
    }
  }, [isOpen, element]);

  // ============================================
  // HANDLERS
  // ============================================

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when field is modified
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validateForm(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t.nameRequired;
    }

    if (!formData.category) {
      newErrors.category = t.categoryRequired;
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = t.quantityRequired;
    } else if (isNaN(parseFloat(formData.quantity)) || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = t.quantityInvalid;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const data: CreateElementInput = {
        project_id: projectId,
        name: formData.name.trim(),
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        quantity_unit: formData.quantity_unit,
        sfb_code: formData.sfb_code.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Error saving element:', error);
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t.editTitle : t.createTitle}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <Input
          name="name"
          label={t.name}
          value={formData.name}
          onChange={handleChange}
          placeholder={t.namePlaceholder}
          error={errors.name}
          autoFocus
        />

        {/* Category Field */}
        <div className="space-y-xs">
          <label className="block text-sm font-medium text-text-primary">
            {t.category}
          </label>
          <div className="grid grid-cols-5 gap-2">
            {ELEMENT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, category: cat.value }));
                  if (errors.category) {
                    setErrors((prev) => ({ ...prev, category: undefined }));
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  formData.category === cat.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white'
                )}
              >
                <ElementCategoryIcon
                  category={cat.value}
                  size="md"
                  colorVariant={formData.category === cat.value ? 'accent' : 'default'}
                />
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {cat[locale]}
                </span>
              </button>
            ))}
          </div>
          {errors.category && (
            <p className="text-sm text-error">{errors.category}</p>
          )}
        </div>

        {/* Quantity and Unit Fields (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="quantity"
            label={t.quantity}
            type="number"
            step="any"
            min="0"
            value={formData.quantity}
            onChange={handleChange}
            placeholder={t.quantityPlaceholder}
            error={errors.quantity}
          />

          <div className="space-y-xs">
            <label className="block text-sm font-medium text-text-primary">
              {t.unit}
            </label>
            <select
              name="quantity_unit"
              value={formData.quantity_unit}
              onChange={handleChange}
              className={cn(
                'w-full rounded-base border border-gray-300 px-md py-sm',
                'text-sm text-gray-900',
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                'transition-colors'
              )}
            >
              {QUANTITY_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SfB Code Field */}
        <Input
          name="sfb_code"
          label={t.sfbCode}
          value={formData.sfb_code}
          onChange={handleChange}
          placeholder={t.sfbCodePlaceholder}
          helperText={t.sfbCodeHelper}
        />

        {/* Description Field */}
        <div className="space-y-xs">
          <label className="block text-sm font-medium text-text-primary">
            {t.description}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={t.descriptionPlaceholder}
            rows={3}
            className={cn(
              'w-full rounded-base border border-gray-300 px-md py-sm',
              'text-sm text-gray-900 placeholder:text-gray-400',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'resize-none transition-colors'
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
          >
            {isSaving ? t.saving : isEditing ? t.save : t.create}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

ElementEditor.displayName = 'ElementEditor';

export default ElementEditor;
