import { createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/stores';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * Profile Page (T105)
 *
 * Displays the authenticated user's profile information.
 * Will be expanded with editable fields, avatar upload, and preferences.
 */
function ProfilePage() {
  const { user } = useAuthStore();
  const initials = user?.email?.substring(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6 text-slate-900 dark:text-white">
        Profile
      </h1>
      <Card className="glass-subtle">
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-[#5B8DEF]/20 text-[#5B8DEF]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
              {user?.email}
            </h2>
            <p className="text-sm text-slate-500">Member</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/profile')({
  component: ProfilePage,
});
