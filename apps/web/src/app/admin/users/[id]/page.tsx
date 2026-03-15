
// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminUsers, AdminUserDetails } from '@/hooks/use-admin';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Mail,
  Calendar,
  Clock,
  Building2,
  MessageSquare,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { getUserDetails, blockUser, unblockUser, promoteUser, demoteUser, isActioning } =
    useAdminUsers();

  const [user, setUser] = useState<AdminUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      setError(null);
      const data = await getUserDetails(userId);
      if (data) {
        setUser(data);
      } else {
        setError('User not found');
      }
      setIsLoading(false);
    };
    loadUser();
  }, [userId, getUserDetails]);

  const handleBlock = async () => {
    const result = await blockUser(userId);
    if (result.success) {
      const data = await getUserDetails(userId);
      if (data) setUser(data);
    }
  };

  const handleUnblock = async () => {
    const result = await unblockUser(userId);
    if (result.success) {
      const data = await getUserDetails(userId);
      if (data) setUser(data);
    }
  };

  const handlePromote = async () => {
    const result = await promoteUser(userId);
    if (result.success) {
      const data = await getUserDetails(userId);
      if (data) setUser(data);
    }
  };

  const handleDemote = async () => {
    const result = await demoteUser(userId);
    if (result.success) {
      const data = await getUserDetails(userId);
      if (data) setUser(data);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader title="User Details" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <>
        <AdminHeader title="User Details" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">User Not Found</h2>
            <p className="mb-4 text-white/70">{error || 'The requested user could not be found.'}</p>
            <Button asChild className="bg-white/10 text-white hover:bg-white/20">
              <Link href="/admin/users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="User Details" description={user.email} />

      <div className="p-6">
        {/* Back Button */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {user.full_name || 'No name'}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-white/50">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.is_blocked ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-400"
                    >
                      <Ban className="mr-1 h-3 w-3" />
                      Blocked
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-green-500/30 bg-green-500/10 text-green-400"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  )}
                  {user.is_super_admin && (
                    <Badge
                      variant="outline"
                      className="border-blue-500/30 bg-blue-500/10 text-blue-400"
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>

              {/* Timeline Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <Calendar className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-sm text-white/50">Joined</p>
                    <p className="text-white">
                      {user.created_at
                        ? format(new Date(user.created_at), 'MMM d, yyyy')
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <Clock className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-sm text-white/50">Last Login</p>
                    <p className="text-white">
                      {user.last_login
                        ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                {user.is_blocked ? (
                  <Button
                    onClick={handleUnblock}
                    disabled={isActioning}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {isActioning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Unblock User
                  </Button>
                ) : (
                  <Button
                    onClick={handleBlock}
                    disabled={isActioning}
                    variant="destructive"
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isActioning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="mr-2 h-4 w-4" />
                    )}
                    Block User
                  </Button>
                )}

                {user.is_super_admin ? (
                  <Button
                    onClick={handleDemote}
                    disabled={isActioning}
                    variant="outline"
                    className="border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                  >
                    {isActioning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="mr-2 h-4 w-4" />
                    )}
                    Remove Admin
                  </Button>
                ) : (
                  <Button
                    onClick={handlePromote}
                    disabled={isActioning}
                    variant="outline"
                    className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                  >
                    {isActioning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="mr-2 h-4 w-4" />
                    )}
                    Make Admin
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-medium text-white">Usage Statistics</h3>
              <div className="space-y-4">
                <StatCard
                  icon={Building2}
                  label="Workspaces"
                  value={user.stats.workspace_count}
                  subValue={`${user.stats.owned_workspace_count} owned`}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Conversations"
                  value={user.stats.conversation_count}
                />
                <StatCard
                  icon={FileText}
                  label="Documents"
                  value={user.stats.document_count}
                />
              </div>
            </div>

            {/* Block Info */}
            {user.is_blocked && user.blocked_at && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
                <h3 className="mb-2 text-lg font-medium text-red-400">Blocked</h3>
                <p className="text-sm text-white/70">
                  Blocked {formatDistanceToNow(new Date(user.blocked_at), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Stats Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  subValue?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-5 w-5 text-white/70" />
      </div>
      <div>
        <p className="text-sm text-white/50">{label}</p>
        <p className="text-lg font-semibold text-white">
          {value}
          {subValue && <span className="ml-2 text-sm font-normal text-white/50">({subValue})</span>}
        </p>
      </div>
    </div>
  );
}
