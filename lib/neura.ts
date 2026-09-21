import type { PreviousSession, SessionReport } from '@/types/report';

const DEFAULT_API = 'https://neura-api-production-3427.up.railway.app';

export function apiBaseUrl(): string {
  const raw = process.env.NEURA_API_URL ?? DEFAULT_API;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export type PublicReport = SessionReport & {
  hasAudio?: boolean;
  previous_sessions?: PreviousSession[];
};

export async function fetchPublicReport(id: string): Promise<PublicReport | null> {
  const res = await fetch(`${apiBaseUrl()}/api/v1/reports/public/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Unable to load report (${res.status})`);
  }
  return (await res.json()) as PublicReport;
}

export function publicVoiceUrl(id: string, report: PublicReport): string | null {
  if (!report.hasAudio && !report.audio_path) return null;
  if (report.audio_path?.startsWith('http')) return report.audio_path;
  const path = report.audio_path ?? `/api/v1/reports/public/${id}/voice`;
  return `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
