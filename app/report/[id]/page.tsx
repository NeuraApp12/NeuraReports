import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { PreviousSession } from '@/types/report';
import { fetchPublicReport, publicVoiceUrl } from '@/lib/neura';
import ReportClient from './ReportClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const report = await fetchPublicReport(params.id);
  if (!report) return { title: 'Report Not Found — LinkBand' };

  return {
    title: `${report.session_name} — LinkBand Report`,
    description: `Brain performance report for ${report.first_name} ${report.last_name}`,
  };
}

export default async function ReportPage({
  params,
}: {
  params: { id: string };
}) {
  const report = await fetchPublicReport(params.id);
  if (!report) notFound();

  const previousSessions = (report.previous_sessions ?? []) as PreviousSession[];
  const audioUrl = publicVoiceUrl(params.id, report);

  return (
    <ReportClient
      report={report}
      previousSessions={previousSessions}
      audioUrl={audioUrl}
    />
  );
}
