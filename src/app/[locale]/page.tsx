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
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl mb-6">
            {locale === 'nl' ? 'Welkom bij GroosHub' : 'Welcome to GroosHub'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {locale === 'nl' 
              ? 'Uw complete platform voor stedelijke ontwikkeling, projectanalyse en intelligente besluitvorming.'
              : 'Your comprehensive platform for urban development, project analysis, and intelligent decision-making.'
            }
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
            <span className="mr-2">🚀</span>
            {locale === 'nl' ? 'Aan de slag' : 'Get Started'}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Link
              key={feature.id}
              href={`/${locale}${feature.href}`}
              className={`
                block p-6 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg
                ${feature.color}
              `}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {'titleKey' in feature ? t(feature.titleKey) : feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {getFeatureDescription(feature.id, locale)}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Start Section */}
        <div className="mt-16 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {locale === 'nl' ? 'Snel aan de slag' : 'Quick Start'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {locale === 'nl' ? 'Kies een tool' : 'Choose a tool'}
              </h3>
              <p className="text-sm text-gray-600">
                {locale === 'nl' 
                  ? 'Selecteer de juiste analyse tool voor uw project'
                  : 'Select the right analysis tool for your project'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {locale === 'nl' ? 'Voer data in' : 'Input data'}
              </h3>
              <p className="text-sm text-gray-600">
                {locale === 'nl'
                  ? 'Upload uw projectgegevens of zoek locaties'
                  : 'Upload your project data or search locations'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {locale === 'nl' ? 'Krijg inzichten' : 'Get insights'}
              </h3>
              <p className="text-sm text-gray-600">
                {locale === 'nl'
                  ? 'Ontvang gedetailleerde analyses en aanbevelingen'
                  : 'Receive detailed analysis and recommendations'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
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