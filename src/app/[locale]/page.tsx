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
  colSpan?: number;
  rowSpan?: number;
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
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    comingSoon: false,
    colSpan: 2,
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
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    comingSoon: false,
    colSpan: 2,
    rowSpan: 2,
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
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
      </svg>
    ),
    comingSoon: true,
    rowSpan: 2,
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
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
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
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    comingSoon: true,
    rowSpan: 2,
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

  // Glass effect for all cards
  const isActive = !card.comingSoon;

  const isLarge = (card.colSpan && card.colSpan > 1) || (card.rowSpan && card.rowSpan > 1);

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300 ease-out
        ${card.comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        gridColumn: card.colSpan ? `span ${card.colSpan}` : undefined,
        gridRow: card.rowSpan ? `span ${card.rowSpan}` : undefined,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        transform: isHovered && isActive ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered && isActive
          ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.12), 0 20px 40px rgba(0, 0, 0, 0.08)'
          : 'inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 16px rgba(0, 0, 0, 0.03)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className={`h-full p-6 flex flex-col ${isLarge ? 'p-8' : ''}`}>
        {/* Icon */}
        <div
          className="mb-4"
          style={{ color: card.comingSoon ? '#6b7280' : '#374151' }}
        >
          {card.icon}
        </div>

        {/* Title */}
        <h2
          className={`font-bold mb-2 ${isLarge ? 'text-3xl' : 'text-xl'}`}
          style={{ color: '#374151' }}
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

        {/* Description - shown on hover only */}
        <div
          className={`
            mt-auto transition-all duration-300 ease-out
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <p
            className={`${isLarge ? 'text-base' : 'text-sm'} leading-relaxed`}
            style={{ color: '#6b7280', opacity: 0.9 }}
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
            style={{ color: '#374151' }}
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
      style={{
        zIndex: 10000,
        backgroundColor: 'var(--color-white)',
      }}
    >
      {/* Gradient blob background - more visible version for landing page */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(12, 33, 26, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(72, 128, 106, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(71, 118, 56, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 70% 20%, rgba(138, 151, 107, 0.15) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      {/* ASCII Map Background - full screen adaptive */}
      <ASCIIMapBackground opacity={0.25} />

      {/* Content container */}
      <div className="relative min-h-screen flex flex-col p-6">
        {/* Logo - top left */}
        <div className="absolute top-4 left-6 z-10">
          <span className="text-2xl font-bold text-gray-800">GroosHub</span>
        </div>

        {/* Language switcher - top right */}
        <div className="absolute top-4 right-6 flex items-center gap-2 text-sm z-10">
          <button
            onClick={() => router.push(`/nl`)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              locale === 'nl'
                ? 'bg-gray-800 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/40'
            }`}
          >
            NL
          </button>
          <button
            onClick={() => router.push(`/en`)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              locale === 'en'
                ? 'bg-gray-800 text-white'
                : 'bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/40'
            }`}
          >
            EN
          </button>
        </div>

        {/* Bento Grid - fills screen */}
        <main className="flex-1 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <div
              className="grid grid-cols-4 gap-4 flex-1"
              style={{
                gridTemplateRows: 'repeat(3, 1fr)',
              }}
            >
              {/*
                Layout:
                Row 1: AI (2 cols) | Project Analyse | LCA (2 rows)
                Row 2: Project Overzicht (2 rows) | Doelgroep (2x2) | [LCA cont]
                Row 3: [Overzicht cont] | [Doelgroep cont] | Project Ontwerp
              */}
              {/* AI Assistant - spans 2 cols */}
              <FeatureCardComponent
                card={FEATURE_CARDS[0]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              {/* Project Analyse */}
              <FeatureCardComponent
                card={FEATURE_CARDS[3]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              {/* LCA - spans 2 rows */}
              <FeatureCardComponent
                card={FEATURE_CARDS[2]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              {/* Project Overzicht - spans 2 rows */}
              <FeatureCardComponent
                card={FEATURE_CARDS[5]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              {/* Doelgroep - spans 2 cols, 2 rows */}
              <FeatureCardComponent
                card={FEATURE_CARDS[1]}
                locale={locale}
                onNavigate={handleNavigate}
              />
              {/* Project Ontwerp */}
              <FeatureCardComponent
                card={FEATURE_CARDS[4]}
                locale={locale}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;
