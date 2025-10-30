// AI Assistant page with locale support
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIAssistantClient } from './AIAssistantClient';

export default async function AIAssistantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/ai-assistant`);
  }

  return <AIAssistantClient locale={locale} userId={session.user.id.toString()} />;
}

// Metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return {
    title: locale === 'nl' ? 'AI Assistent - GroosHub' : 'AI Assistant - GroosHub',
    description:
      locale === 'nl'
        ? 'Chat met onze AI assistent over locatiedata, demografie en vastgoed'
        : 'Chat with our AI assistant about location data, demographics, and real estate',
  };
}
