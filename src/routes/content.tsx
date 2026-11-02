import { createFileRoute } from '@tanstack/react-router';
import { ContentPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/content')({ head: () => dashboardHead('Content management'), component: ContentPage });