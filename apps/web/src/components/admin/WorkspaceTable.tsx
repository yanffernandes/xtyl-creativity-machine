
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  Eye,
  Loader2,
  Building2,
  Users,
  FolderKanban,
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
import { AdminWorkspace } from '@/hooks/use-admin';
import Link from 'next/link';

interface WorkspaceTableProps {
  workspaces: AdminWorkspace[];
  isLoading: boolean;
}

export function WorkspaceTable({ workspaces, isLoading }: WorkspaceTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="mb-4 h-12 w-12 text-white/30" />
        <p className="text-lg text-white/50">No workspaces found</p>
        <p className="text-sm text-white/30">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white/70">Workspace</TableHead>
            <TableHead className="text-white/70">Owner</TableHead>
            <TableHead className="text-white/70">Members</TableHead>
            <TableHead className="text-white/70">Projects</TableHead>
            <TableHead className="text-white/70">Created</TableHead>
            <TableHead className="text-right text-white/70">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map((workspace) => (
            <TableRow
              key={workspace.id}
              className="border-white/10 hover:bg-white/5"
            >
              <TableCell>
                <div>
                  <p className="font-medium text-white">{workspace.name}</p>
                  {workspace.description && (
                    <p className="max-w-xs truncate text-sm text-white/50">
                      {workspace.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm text-white">{workspace.owner_name || 'Unknown'}</p>
                  <p className="text-xs text-white/50">{workspace.owner_email}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white/70"
                >
                  <Users className="mr-1 h-3 w-3" />
                  {workspace.member_count}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white/70"
                >
                  <FolderKanban className="mr-1 h-3 w-3" />
                  {workspace.project_count}
                </Badge>
              </TableCell>
              <TableCell className="text-white/50">
                {workspace.created_at
                  ? formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })
                  : 'Unknown'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
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
                        href={`/admin/workspaces/${workspace.id}`}
                        className="cursor-pointer text-white hover:bg-white/10"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
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
