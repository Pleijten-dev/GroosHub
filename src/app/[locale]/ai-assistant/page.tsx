// AI Assistant page with locale support
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/features/chat/components/chat';
import { getTranslations } from '@/lib/i18n/config';

export default async function AIAssistantPage({
  params,
}: {
  params: { locale: string };
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session) {
    redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/ai-assistant`);
  }

  const t = await getTranslations(params.locale);

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height))] flex-col">
      <ChatInterface locale={params.locale} />
    </div>
  );
}

// Metadata
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations(params.locale);

  return {
    title: params.locale === 'nl' ? 'AI Assistent - GroosHub' : 'AI Assistant - GroosHub',
    description:
      params.locale === 'nl'
        ? 'Chat met onze AI assistent over locatiedata, demografie en vastgoed'
        : 'Chat with our AI assistant about location data, demographics, and real estate',
  };
}
