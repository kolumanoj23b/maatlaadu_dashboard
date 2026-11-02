import { createFileRoute } from '@tanstack/react-router';
import { ResetPasswordPage } from '@/components/dashboard';
import { dashboardHead } from '@/lib/dashboard';
export const Route = createFileRoute('/reset-password')({ head: () => dashboardHead('Set a new password'), component: ResetPasswordPage });
