import { createFileRoute } from '@tanstack/react-router';
import { TranslationsPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/translations')({ head: () => dashboardHead('Translation analytics'), component: TranslationsPage });
