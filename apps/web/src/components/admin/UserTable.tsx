
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  UserCog,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminUser } from '@/hooks/use-admin';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface UserTableProps {
  users: AdminUser[];
  isLoading: boolean;
  isActioning: boolean;
  onBlock: (userId: string) => Promise<unknown>;
  onUnblock: (userId: string) => Promise<unknown>;
  onPromote: (userId: string) => Promise<unknown>;
  onDemote: (userId: string) => Promise<unknown>;
}

export function UserTable({
  users,
  isLoading,
  isActioning,
  onBlock,
  onUnblock,
  onPromote,
  onDemote,
}: UserTableProps) {
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  const handleAction = async (userId: string, action: () => Promise<unknown>) => {
    setActioningUserId(userId);
    try {
      await action();
    } finally {
      setActioningUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserCog className="mb-4 h-12 w-12 text-white/30" />
        <p className="text-lg text-white/50">No users found</p>
        <p className="text-sm text-white/30">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/70">User</TableHead>
            <TableHead className="text-white/70">Status</TableHead>
            <TableHead className="text-white/70">Role</TableHead>
            <TableHead className="text-white/70">Joined</TableHead>
            <TableHead className="text-right text-white/70">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="border-white/10 hover:bg-white/5"
            >
              <TableCell>
                <div>
                  <p className="font-medium text-white">{user.full_name || 'No name'}</p>
                  <p className="text-sm text-white/50">{user.email}</p>
                </div>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
                {user.is_super_admin ? (
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-blue-500/10 text-blue-400"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white/70"
                  >
                    User
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-white/50">
                {user.created_at
                  ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
                  : 'Unknown'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={actioningUserId === user.id || isActioning}
                      className="text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      {actioningUserId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 border-white/10 bg-slate-900/95 backdrop-blur-xl"
                  >
                    <DropdownMenuLabel className="text-white/70">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="cursor-pointer text-white hover:bg-white/10"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {user.is_blocked ? (
                      <DropdownMenuItem
                        onClick={() => handleAction(user.id, () => onUnblock(user.id))}
                        className="cursor-pointer text-green-400 hover:bg-green-500/20"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Unblock User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleAction(user.id, () => onBlock(user.id))}
                        className="cursor-pointer text-red-400 hover:bg-red-500/20"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Block User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    {user.is_super_admin ? (
                      <DropdownMenuItem
                        onClick={() => handleAction(user.id, () => onDemote(user.id))}
                        className="cursor-pointer text-orange-400 hover:bg-orange-500/20"
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Remove Admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleAction(user.id, () => onPromote(user.id))}
                        className="cursor-pointer text-blue-400 hover:bg-blue-500/20"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
