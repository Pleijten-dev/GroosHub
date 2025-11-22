/**
 * Location Pages Layout
 * Conditionally wraps rapport pages (housing, community, public) with sidebar navigation
 * The main location page has its own sidebar implementation
 */

'use client';

import React from 'react';
import { usePathname, useParams } from 'next/navigation';
import { LocationSidebarWrapper } from '@/features/location/components/LocationSidebar/LocationSidebarWrapper';
import type { Locale } from '@/lib/i18n/config';

export default function LocationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as Locale) || 'nl';

  // Check if we're on a rapport sub-page (housing, community, public)
  const isRapportPage = pathname.includes('/location/housing') ||
                        pathname.includes('/location/community') ||
                        pathname.includes('/location/public');

  // Main location page has its own sidebar, so don't wrap it
  if (!isRapportPage) {
    return <>{children}</>;
  }

  // Rapport pages need the shared sidebar for navigation
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for rapport pages */}
      <aside className="fixed left-0 top-navbar h-[calc(100vh-var(--navbar-height))] w-80 bg-white/80 backdrop-blur-md border-r border-gray-200/50 shadow-lg z-40">
        <LocationSidebarWrapper locale={locale} />
      </aside>

      {/* Main content with left margin for sidebar */}
      <main className="flex-1 ml-80 overflow-auto">
        {children}
      </main>
    </div>
  );
}
