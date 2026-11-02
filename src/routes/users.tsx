import { createFileRoute } from '@tanstack/react-router';
import { UsersPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/users')({ head: () => dashboardHead('Users'), component: UsersPage });