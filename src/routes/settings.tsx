import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/settings')({ head: () => dashboardHead('Settings'), component: SettingsPage });