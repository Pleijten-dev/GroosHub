// src/app/[locale]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, isValidLocale } from '../../lib/i18n/config';
import { useParams } from 'next/navigation';
import { ASCIIMapBackground } from './components/ASCIIMapBackground';

// PVE Color scheme
const PVE_COLORS = {
  apartments: '#8a976b',   // Light sage green
  commercial: '#778a5e',   // Olive green
  hospitality: '#63834c',  // Forest green
  social: '#477638',       // Deep green
  communal: '#48806a',     // Teal green
  offices: '#0c211a',      // Near black
};

interface FeatureCard {
  id: string;
  titleKey: {
    nl: string;
    en: string;
  };
  descriptionKey: {
    nl: string;
    en: string;
  };
  href: string;
  color: string;
  hoverColor: string;
  textColor: string;
  icon: React.ReactNode;
  comingSoon: boolean;
  large?: boolean;
}

// Feature cards configuration
const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'ai-assistant',
    titleKey: {
      nl: 'AI Assistent',
      en: 'AI Assistant',
    },
    descriptionKey: {
      nl: 'Intelligente AI-assistent met geheugen, documentanalyse en projectcontext. Ondersteunt 17+ AI modellen, taakbeheer en notities.',
      en: 'Intelligent AI assistant with memory, document analysis and project context. Supports 17+ AI models, task management and notes.',
    },
    href: '/ai-assistant',
    color: PVE_COLORS.apartments,
    hoverColor: '#7a876b',
    textColor: '#ffffff',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    comingSoon: false,
  },
  {
    id: 'urban-analysis',
    titleKey: {
      nl: 'Doelgroepen & Programma',
      en: 'Target Groups & Program',
    },
    descriptionKey: {
      nl: 'Uitgebreide locatieanalyse met CBS data, 27 doelgroepen matching, interactieve kaarten met 15+ WMS lagen, 3D visualisaties en AI-gegenereerde bouwprogramma\'s.',
      en: 'Comprehensive location analysis with CBS data, 27 target group matching, interactive maps with 15+ WMS layers, 3D visualizations and AI-generated building programs.',
    },
    href: '/location',
    color: PVE_COLORS.social,
    hoverColor: '#3a6630',
    textColor: '#ffffff',
    icon: (
      <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    comingSoon: false,
    large: true,
  },
  {
    id: 'lca-calculator',
    titleKey: {
      nl: 'LCA Berekening',
      en: 'LCA Calculator',
    },
    descriptionKey: {
      nl: 'Binnenkort beschikbaar...',
      en: 'Coming soon...',
    },
    href: '/lca',
    color: '#9ca3af',
    hoverColor: '#9ca3af',
    textColor: '#6b7280',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: 'project-analysis',
    titleKey: {
      nl: 'Project Analyse',
      en: 'Project Analysis',
    },
    descriptionKey: {
      nl: 'Binnenkort beschikbaar...',
      en: 'Coming soon...',
    },
    href: '/project-analysis',
    color: '#9ca3af',
    hoverColor: '#9ca3af',
    textColor: '#6b7280',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: 'project-design',
    titleKey: {
      nl: 'Project Ontwerp',
      en: 'Project Design',
    },
    descriptionKey: {
      nl: 'Binnenkort beschikbaar...',
      en: 'Coming soon...',
    },
    href: '/project-design',
    color: '#9ca3af',
    hoverColor: '#9ca3af',
    textColor: '#6b7280',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: 'project-overview',
    titleKey: {
      nl: 'Project Overzicht',
      en: 'Project Overview',
    },
    descriptionKey: {
      nl: 'Binnenkort beschikbaar...',
      en: 'Coming soon...',
    },
    href: '/project-overview',
    color: '#9ca3af',
    hoverColor: '#9ca3af',
    textColor: '#6b7280',
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    comingSoon: true,
  },
];

interface FeatureCardComponentProps {
  card: FeatureCard;
  locale: Locale;
  onNavigate: (href: string) => void;
}

const FeatureCardComponent: React.FC<FeatureCardComponentProps> = ({ card, locale, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const title = card.titleKey[locale];
  const description = card.descriptionKey[locale];

  const handleClick = () => {
    if (!card.comingSoon) {
      onNavigate(`/${locale}${card.href}`);
    }
  };

  // Glass effect for inactive cards, solid color for active
  const isActive = !card.comingSoon;
  const useGlass = card.comingSoon;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300 ease-out
        ${card.large ? 'col-span-2 row-span-2' : ''}
        ${card.comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${useGlass ? 'backdrop-blur-md' : ''}
      `}
      style={{
        backgroundColor: useGlass
          ? 'rgba(255, 255, 255, 0.25)'
          : (isHovered ? card.hoverColor : card.color),
        transform: isHovered && isActive ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered && isActive
          ? '0 20px 40px -12px rgba(0, 0, 0, 0.35)'
          : '0 4px 20px -4px rgba(0, 0, 0, 0.1)',
        border: useGlass ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className={`h-full p-6 flex flex-col ${card.large ? 'p-8' : ''}`}>
        {/* Icon */}
        <div
          className="mb-4"
          style={{ color: useGlass ? '#6b7280' : card.textColor }}
        >
          {card.icon}
        </div>

        {/* Title */}
        <h2
          className={`font-bold mb-2 ${card.large ? 'text-3xl' : 'text-xl'}`}
          style={{ color: useGlass ? '#374151' : card.textColor }}
        >
          {title}
        </h2>

        {/* Coming soon badge */}
        {card.comingSoon && (
          <span
            className="inline-block px-3 py-1 text-sm font-medium rounded-full mb-3 w-fit"
            style={{
              backgroundColor: 'rgba(71, 118, 56, 0.15)',
              color: '#477638'
            }}
          >
            {locale === 'nl' ? 'Binnenkort' : 'Coming Soon'}
          </span>
        )}

        {/* Description - shown on hover or always for large cards */}
        <div
          className={`
            mt-auto transition-all duration-300 ease-out
            ${card.large ? 'opacity-100' : isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <p
            className={`${card.large ? 'text-base' : 'text-sm'} leading-relaxed`}
            style={{ color: useGlass ? '#6b7280' : card.textColor, opacity: 0.9 }}
          >
            {description}
          </p>
        </div>

        {/* Arrow indicator for active cards */}
        {isActive && (
          <div
            className={`
              absolute bottom-4 right-4 transition-all duration-300 ease-out
              ${isHovered ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}
            `}
            style={{ color: card.textColor }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const localeParam = params?.locale as string;

  // Validate locale
  const locale: Locale = isValidLocale(localeParam) ? localeParam : 'nl';

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 overflow-auto"
      style={{ zIndex: 10000 }}
    >
      {/* ASCII Map Background - full screen adaptive */}
      <ASCIIMapBackground opacity={0.25} />

      {/* Content container */}
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-6 pb-4 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">GROOSHUB</span>
            </div>

            {/* Language switcher */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => router.push(`/nl`)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  locale === 'nl'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white/50 backdrop-blur-sm text-gray-600 hover:bg-white/70'
                }`}
              >
                NL
              </button>
              <button
                onClick={() => router.push(`/en`)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  locale === 'en'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white/50 backdrop-blur-sm text-gray-600 hover:bg-white/70'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </header>

        {/* Bento Grid - fills remaining space */}
        <main className="flex-1 px-8 pb-6 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <div
              className="grid grid-cols-4 gap-4 flex-1"
              style={{
                gridTemplateRows: 'repeat(3, 1fr)',
              }}
            >
              {/* Row 1: AI Assistant | Doelgroepen (large, spans 2 cols) | LCA */}
              <FeatureCardComponent
                card={FEATURE_CARDS[0]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              <FeatureCardComponent
                card={FEATURE_CARDS[1]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              <FeatureCardComponent
                card={FEATURE_CARDS[2]}
                locale={locale}
                onNavigate={handleNavigate}
              />

              {/* Row 2: Project Analysis | (Doelgroepen continues) | Project Design | Project Overview */}
              <FeatureCardComponent
                card={FEATURE_CARDS[3]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              <FeatureCardComponent
                card={FEATURE_CARDS[4]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              <FeatureCardComponent
                card={FEATURE_CARDS[5]}
                locale={locale}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} GroosHub. {locale === 'nl' ? 'Alle rechten voorbehouden.' : 'All rights reserved.'}</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
