'use client';

// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserTable } from '@/components/admin/UserTable';
import { useAdminUsers } from '@/hooks/use-admin';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function AdminUsersPage() {
  const {
    users,
    total,
    page,
    isLoading,
    isActioning,
    error,
    fetchUsers,
    blockUser,
    unblockUser,
    promoteUser,
    demoteUser,
  } = useAdminUsers();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setCurrentPage(1);
      const filters: { search?: string; is_blocked?: boolean; is_super_admin?: boolean } = {};
      if (value) filters.search = value;
      if (statusFilter === 'blocked') filters.is_blocked = true;
      if (statusFilter === 'active') filters.is_blocked = false;
      if (roleFilter === 'admin') filters.is_super_admin = true;
      if (roleFilter === 'user') filters.is_super_admin = false;
      fetchUsers({ skip: 0, limit: ITEMS_PER_PAGE, ...filters });
    },
    [statusFilter, roleFilter, fetchUsers]
  );

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    const filters: { search?: string; is_blocked?: boolean; is_super_admin?: boolean } = {};
    if (search) filters.search = search;
    if (value === 'blocked') filters.is_blocked = true;
    if (value === 'active') filters.is_blocked = false;
    if (roleFilter === 'admin') filters.is_super_admin = true;
    if (roleFilter === 'user') filters.is_super_admin = false;
    fetchUsers({ skip: 0, limit: ITEMS_PER_PAGE, ...filters });
  };

  const handleRoleFilter = (value: string) => {
    setRoleFilter(value);
    setCurrentPage(1);
    const filters: { search?: string; is_blocked?: boolean; is_super_admin?: boolean } = {};
    if (search) filters.search = search;
    if (statusFilter === 'blocked') filters.is_blocked = true;
    if (statusFilter === 'active') filters.is_blocked = false;
    if (value === 'admin') filters.is_super_admin = true;
    if (value === 'user') filters.is_super_admin = false;
    fetchUsers({ skip: 0, limit: ITEMS_PER_PAGE, ...filters });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const skip = (newPage - 1) * ITEMS_PER_PAGE;
    const filters: { search?: string; is_blocked?: boolean; is_super_admin?: boolean } = {};
    if (search) filters.search = search;
    if (statusFilter === 'blocked') filters.is_blocked = true;
    if (statusFilter === 'active') filters.is_blocked = false;
    if (roleFilter === 'admin') filters.is_super_admin = true;
    if (roleFilter === 'user') filters.is_super_admin = false;
    fetchUsers({ skip, limit: ITEMS_PER_PAGE, ...filters });
  };

  const handleRefresh = () => {
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;
    const filters: { search?: string; is_blocked?: boolean; is_super_admin?: boolean } = {};
    if (search) filters.search = search;
    if (statusFilter === 'blocked') filters.is_blocked = true;
    if (statusFilter === 'active') filters.is_blocked = false;
    if (roleFilter === 'admin') filters.is_super_admin = true;
    if (roleFilter === 'user') filters.is_super_admin = false;
    fetchUsers({ skip, limit: ITEMS_PER_PAGE, ...filters });
  };

  return (
    <>
      <AdminHeader title="Users" description="Manage platform users" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">User Management</h2>
              <p className="text-sm text-white/50">{total} total users</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-white">
              <Filter className="mr-2 h-4 w-4 text-white/40" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-900/95 backdrop-blur-xl">
              <SelectItem value="all" className="text-white">
                All Status
              </SelectItem>
              <SelectItem value="active" className="text-white">
                Active
              </SelectItem>
              <SelectItem value="blocked" className="text-white">
                Blocked
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={handleRoleFilter}>
            <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-white">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-900/95 backdrop-blur-xl">
              <SelectItem value="all" className="text-white">
                All Roles
              </SelectItem>
              <SelectItem value="admin" className="text-white">
                Admins
              </SelectItem>
              <SelectItem value="user" className="text-white">
                Users
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* User Table */}
        <UserTable
          users={users}
          isLoading={isLoading}
          isActioning={isActioning}
          onBlock={blockUser}
          onUnblock={unblockUser}
          onPromote={promoteUser}
          onDemote={demoteUser}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-white/50">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-white/70">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
