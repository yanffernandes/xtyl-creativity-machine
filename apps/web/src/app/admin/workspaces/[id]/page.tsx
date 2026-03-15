
// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useAdminWorkspaces, AdminWorkspaceDetails, WorkspaceMember } from '@/hooks/use-admin';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  FolderKanban,
  Calendar,
  HardDrive,
  MessageSquare,
  FileText,
  AlertCircle,
  UserMinus,
  Crown,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function WorkspaceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const { getWorkspaceDetails, removeMember, transferOwnership, isActioning } =
    useAdminWorkspaces();

  const [workspace, setWorkspace] = useState<AdminWorkspaceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      setIsLoading(true);
      setError(null);
      const data = await getWorkspaceDetails(workspaceId);
      if (data) {
        setWorkspace(data);
      } else {
        setError('Workspace not found');
      }
      setIsLoading(false);
    };
    loadWorkspace();
  }, [workspaceId, getWorkspaceDetails]);

  const handleRemoveMember = async (userId: string) => {
    setRemovingMember(userId);
    const result = await removeMember(workspaceId, userId);
    if (result.success) {
      const data = await getWorkspaceDetails(workspaceId);
      if (data) setWorkspace(data);
    }
    setRemovingMember(null);
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    const result = await transferOwnership(workspaceId, selectedNewOwner);
    if (result.success) {
      const data = await getWorkspaceDetails(workspaceId);
      if (data) setWorkspace(data);
      setTransferDialogOpen(false);
      setSelectedNewOwner('');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <AdminHeader title="Workspace Details" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </>
    );
  }

  // Error state
  if (error || !workspace) {
    return (
      <>
        <AdminHeader title="Workspace Details" />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">Workspace Not Found</h2>
            <p className="mb-4 text-white/70">{error || 'The requested workspace could not be found.'}</p>
            <Button asChild className="bg-white/10 text-white hover:bg-white/20">
              <Link href="/admin/workspaces">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspaces
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Get non-owner members for transfer dialog
  const eligibleNewOwners = workspace.members.filter(
    (m) => m.user_id !== workspace.owner_id
  );

  return (
    <>
      <AdminHeader title="Workspace Details" description={workspace.name} />

      <div className="p-6">
        {/* Back Button */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Link href="/admin/workspaces">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workspaces
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                    <Building2 className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{workspace.name}</h2>
                    {workspace.description && (
                      <p className="mt-1 text-white/50">{workspace.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => setTransferDialogOpen(true)}
                  disabled={eligibleNewOwners.length === 0}
                  variant="outline"
                  className="border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </Button>
              </div>

              {/* Owner Info */}
              <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm text-white/50">Owner</p>
                    <p className="text-white">{workspace.owner_name || 'Unknown'}</p>
                    <p className="text-sm text-white/50">{workspace.owner_email}</p>
                  </div>
                </div>
              </div>

              {/* Timeline Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <Calendar className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-sm text-white/50">Created</p>
                    <p className="text-white">
                      {workspace.created_at
                        ? format(new Date(workspace.created_at), 'MMM d, yyyy')
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <Calendar className="h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-sm text-white/50">Last Updated</p>
                    <p className="text-white">
                      {workspace.updated_at
                        ? formatDistanceToNow(new Date(workspace.updated_at), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
                <Users className="h-5 w-5 text-white/70" />
                Members ({workspace.members.length})
              </h3>
              <div className="rounded-lg border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">User</TableHead>
                      <TableHead className="text-white/70">Role</TableHead>
                      <TableHead className="text-white/70">Joined</TableHead>
                      <TableHead className="text-right text-white/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspace.members.map((member) => (
                      <TableRow key={member.user_id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {member.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-white/50">{member.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.user_id === workspace.owner_id ? (
                            <Badge
                              variant="outline"
                              className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                            >
                              <Crown className="mr-1 h-3 w-3" />
                              Owner
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-white/20 bg-white/5 text-white/70"
                            >
                              {member.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white/50">
                          {member.joined_at
                            ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })
                            : 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          {member.user_id !== workspace.owner_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={removingMember === member.user_id || isActioning}
                              className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                            >
                              {removingMember === member.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <UserMinus className="mr-1 h-4 w-4" />
                                  Remove
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-medium text-white">Statistics</h3>
              <div className="space-y-4">
                <StatCard
                  icon={Users}
                  label="Members"
                  value={workspace.member_count}
                />
                <StatCard
                  icon={FolderKanban}
                  label="Projects"
                  value={workspace.project_count}
                />
                <StatCard
                  icon={FileText}
                  label="Documents"
                  value={workspace.stats.document_count}
                />
                <StatCard
                  icon={MessageSquare}
                  label="Conversations"
                  value={workspace.stats.conversation_count}
                />
                <StatCard
                  icon={HardDrive}
                  label="Storage Used"
                  value={formatBytes(workspace.stats.storage_used_bytes)}
                  isText
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="border-white/10 bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Transfer Ownership</DialogTitle>
            <DialogDescription className="text-white/70">
              Select a new owner for this workspace. The current owner will become a regular member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
                <SelectValue placeholder="Select new owner" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900/95 backdrop-blur-xl">
                {eligibleNewOwners.map((member) => (
                  <SelectItem
                    key={member.user_id}
                    value={member.user_id}
                    className="text-white"
                  >
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTransferDialogOpen(false)}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={!selectedNewOwner || isActioning}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isActioning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="mr-2 h-4 w-4" />
              )}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Stats Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  isText = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-5 w-5 text-white/70" />
      </div>
      <div>
        <p className="text-sm text-white/50">{label}</p>
        <p className="text-lg font-semibold text-white">
          {isText ? value : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
