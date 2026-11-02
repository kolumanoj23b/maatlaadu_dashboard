import { createFileRoute } from '@tanstack/react-router';
import { PracticePage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/practice')({ head: () => dashboardHead('Practice analytics'), component: PracticePage });
