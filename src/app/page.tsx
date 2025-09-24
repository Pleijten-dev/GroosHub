// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Immediately redirect to Dutch locale
  redirect('/nl');
}

// Add metadata for SEO
export const metadata = {
  title: 'GroosHub - Redirecting...',
  description: 'Redirecting to Dutch version',
};