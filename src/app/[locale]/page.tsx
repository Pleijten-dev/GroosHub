// src/app/[locale]/page.tsx
import React from 'react';
import Link from 'next/link';
import { Locale, isValidLocale } from '../../lib/i18n/config';
import { notFound } from 'next/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>; // Next.js 15 change: params is now a Promise
}

// Make this a Server Component by removing 'use client' and using async
const HomePage: React.FC<HomePageProps> = async ({ params }) => {
  // Await params before using its properties
  const { locale: localeParam } = await params;
  
  // Validate locale
  if (!isValidLocale(localeParam)) {
    notFound();
  }
  
  const locale = localeParam as Locale;

  // Translation function (simplified for server component)
  const t = (key: string) => {
    const translations = {
      nl: {
        'nav.aiAssistant': 'AI Assistent',
        'nav.urbanAnalysis': 'Stedelijke Analyse',
        'nav.projectAnalysis': 'Project Analyse',
        'nav.projectDesign': 'Project Ontwerp',
        'nav.projectOverview': 'Project Overzicht',
      },
      en: {
        'nav.aiAssistant': 'AI Assistant',
        'nav.urbanAnalysis': 'Urban Analysis',
        'nav.projectAnalysis': 'Project Analysis',
        'nav.projectDesign': 'Project Design',
        'nav.projectOverview': 'Project Overview',
      },
    };
    
    return translations[locale][key as keyof typeof translations[typeof locale]] || key;
  };

  const features = [
    {
      id: 'ai-assistant',
      icon: '🤖',
      titleKey: 'nav.aiAssistant',
      href: '/ai-assistant',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'urban-analysis',
      icon: '🏙️',
      titleKey: 'nav.urbanAnalysis',
      href: '/urban-analysis',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      id: 'project-analysis',
      icon: '📊',
      titleKey: 'nav.projectAnalysis',
      href: '/project-analysis',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      id: 'project-design',
      icon: '✏️',
      titleKey: 'nav.projectDesign',
      href: '/project-design',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      id: 'project-overview',
      icon: '📋',
      titleKey: 'nav.projectOverview',
      href: '/project-overview',
      color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    },
    {
      id: 'location',
      icon: '📍',
      title: locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis',
      href: '/location',
      color: 'bg-red-50 hover:bg-red-100 border-red-200'
    }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    </div>
  );
};

// Helper function for feature descriptions with proper typing
function getFeatureDescription(featureId: string, locale: Locale): string {
  const descriptions: Record<Locale, Record<string, string>> = {
    nl: {
      'ai-assistant': 'Intelligente AI-assistent voor projectadvies en besluitvorming',
      'urban-analysis': 'Uitgebreide stedelijke data-analyse en visualisatie',
      'project-analysis': 'Diepgaande projectevaluatie en risicoanalyse',
      'project-design': 'Ontwerp en planningstools voor uw projecten',
      'project-overview': 'Centraal overzicht van al uw projecten',
      'location': 'Gedetailleerde locatieanalyse met CBS-data'
    },
    en: {
      'ai-assistant': 'Intelligent AI assistant for project advice and decision-making',
      'urban-analysis': 'Comprehensive urban data analysis and visualization',
      'project-analysis': 'In-depth project evaluation and risk analysis',
      'project-design': 'Design and planning tools for your projects',
      'project-overview': 'Central overview of all your projects',
      'location': 'Detailed location analysis with CBS data'
    }
  };

  return descriptions[locale][featureId] || '';
}

export default HomePage;