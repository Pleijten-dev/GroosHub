'use client';

import { useState } from 'react';
import MaterialForm from './MaterialForm';
import MaterialList from './MaterialList';

interface MaterialsPageClientProps {
  locale: 'nl' | 'en';
}

export default function MaterialsPageClient({ locale }: MaterialsPageClientProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const translations = {
    nl: {
      title: 'Materiaal Beheer',
      subtitle: 'Beheer de LCA materiaaldatabase',
      createNew: 'Nieuw Materiaal Toevoegen',
      viewList: 'Bekijk Lijst',
      warning: '⚠️ Let op: Vul alle vereiste velden zorgvuldig in. Onvolledige gegevens kunnen leiden tot onjuiste LCA berekeningen.'
    },
    en: {
      title: 'Material Management',
      subtitle: 'Manage the LCA materials database',
      createNew: 'Add New Material',
      viewList: 'View List',
      warning: '⚠️ Warning: Fill in all required fields carefully. Incomplete data can lead to incorrect LCA calculations.'
    }
  };

  const t = translations[locale];

  const handleMaterialCreated = () => {
    setView('list');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-xs">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setView(view === 'list' ? 'create' : 'list')}
          className="px-lg py-md bg-primary text-white rounded-base hover:bg-primary/90 transition-colors font-medium"
        >
          {view === 'list' ? t.createNew : t.viewList}
        </button>
      </div>

      {/* Warning Banner */}
      {view === 'create' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-base">
          <p className="text-sm text-yellow-800">{t.warning}</p>
        </div>
      )}

      {/* Content */}
      {view === 'list' ? (
        <MaterialList locale={locale} refreshTrigger={refreshTrigger} />
      ) : (
        <MaterialForm locale={locale} onSuccess={handleMaterialCreated} />
      )}
    </div>
  );
}
