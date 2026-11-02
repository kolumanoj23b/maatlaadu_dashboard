import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';

export const Route = createFileRoute('/')({ head: () => dashboardHead('Overview'), component: OverviewPage });
