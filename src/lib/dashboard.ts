export const reportingPeriods = ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom range'] as const;

export function dashboardHead(title: string) {
  const description = `${title} for Maatlaadu, the Telugu-to-English learning platform. Administrative learning insights and activity.`;
  return { meta: [{ title: `${title} · Maatlaadu Admin` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · Maatlaadu Admin` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}