import { createFileRoute } from '@tanstack/react-router';
import { LearningPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/learning')({ head: () => dashboardHead('Learning analytics'), component: LearningPage });
