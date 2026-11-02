import { createFileRoute } from '@tanstack/react-router';
import { HealthPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/health')({ head: () => dashboardHead('System health'), component: HealthPage });