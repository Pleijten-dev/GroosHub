'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface NewProjectFormProps {
  locale: string;
}

export function NewProjectForm({ locale }: NewProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_number: ''
  });

  const translations = {
    nl: {
      createProject: 'Nieuw Project Aanmaken',
      projectName: 'Projectnaam',
      projectNamePlaceholder: 'Voer projectnaam in',
      projectNumber: 'Projectnummer',
      projectNumberPlaceholder: 'Optioneel projectnummer',
      description: 'Beschrijving',
      descriptionPlaceholder: 'Optionele projectbeschrijving',
      cancel: 'Annuleren',
      create: 'Aanmaken',
      creating: 'Aanmaken...',
      nameRequired: 'Projectnaam is verplicht',
      error: 'Fout bij het aanmaken van project',
      success: 'Project succesvol aangemaakt!'
    },
    en: {
      createProject: 'Create New Project',
      projectName: 'Project Name',
      projectNamePlaceholder: 'Enter project name',
      projectNumber: 'Project Number',
      projectNumberPlaceholder: 'Optional project number',
      description: 'Description',
      descriptionPlaceholder: 'Optional project description',
      cancel: 'Cancel',
      create: 'Create',
      creating: 'Creating...',
      nameRequired: 'Project name is required',
      error: 'Error creating project',
      success: 'Project created successfully!'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t.nameRequired);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          project_number: formData.project_number.trim() || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.error);
      }

      const data = await res.json();

      // Redirect to the new project
      router.push(`/${locale}/projects/${data.project.id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : t.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-2xl font-bold mb-base">{t.createProject}</h1>

        <form onSubmit={handleSubmit} className="space-y-base">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-xs">
              {t.projectName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t.projectNamePlaceholder}
              className={cn(
                'w-full px-base py-sm border rounded-lg',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-colors',
                error && !formData.name.trim() ? 'border-red-500' : 'border-gray-300'
              )}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Project Number */}
          <div>
            <label htmlFor="project_number" className="block text-sm font-medium text-gray-700 mb-xs">
              {t.projectNumber}
            </label>
            <input
              type="text"
              id="project_number"
              name="project_number"
              value={formData.project_number}
              onChange={handleChange}
              placeholder={t.projectNumberPlaceholder}
              className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-xs">
              {t.description}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t.descriptionPlaceholder}
              rows={4}
              className="w-full px-base py-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-y"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-base py-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-base justify-end pt-base border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              size="base"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="base"
              disabled={isSubmitting}
            >
              {isSubmitting ? t.creating : t.create}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default NewProjectForm;
