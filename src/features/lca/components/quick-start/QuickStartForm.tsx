// ============================================
// QUICK START FORM COMPONENT
// ============================================
// TODO: Implement this component
// See: Documentation/LCA_IMPLEMENTATION_TODO.md - Phase 2.1

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuickStartFormData } from '../../types';

export function QuickStartForm() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formData, setFormData] = useState<QuickStartFormData>({
    name: '',
    gfa: '',
    buildingType: 'rijwoning',
    constructionSystem: 'houtskelet',
    insulationLevel: 'rc_6.0',
    energyLabel: 'A++'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Implement API call to create project from template
    const response = await fetch('/api/lca/projects/quick-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const { projectId } = await response.json();
      router.push(`/lca/projects/${projectId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Snel Starten</h1>
      <p className="text-gray-600">
        Maak een snelle inschatting in 5 minuten
      </p>

      {/* TODO: Add form fields */}
      {/* - Project name input */}
      {/* - GFA number input */}
      {/* - Building type select */}
      {/* - Construction system select */}
      {/* - Insulation level select */}
      {/* - Energy label select */}

      <div className="flex gap-4">
        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Project Aanmaken
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}

export default QuickStartForm;
