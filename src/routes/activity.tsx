import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/activity')({ head: () => dashboardHead('Recent activity'), component: ActivityPage });