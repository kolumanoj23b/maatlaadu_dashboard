import { createFileRoute } from '@tanstack/react-router';
import { AuthPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/auth')({ head: () => dashboardHead('Admin sign in'), component: AuthPage });