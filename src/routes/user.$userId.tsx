import { createFileRoute } from '@tanstack/react-router';
import { UserDetailPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/user/$userId')({ head: () => dashboardHead('User profile'), component: UserDetailPage });