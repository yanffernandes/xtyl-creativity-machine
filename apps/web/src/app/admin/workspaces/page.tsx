
// Prevent static generation - requires runtime environment variables
export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { WorkspaceTable } from '@/components/admin/WorkspaceTable';
import { useAdminWorkspaces } from '@/hooks/use-admin';
import {
  Building2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function AdminWorkspacesPage() {
  const {
    workspaces,
    total,
    page,
    isLoading,
    error,
    fetchWorkspaces,
  } = useAdminWorkspaces();

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setCurrentPage(1);
      const filters: { search?: string } = {};
      if (value) filters.search = value;
      fetchWorkspaces({ skip: 0, limit: ITEMS_PER_PAGE, ...filters });
    },
    [fetchWorkspaces]
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const skip = (newPage - 1) * ITEMS_PER_PAGE;
    const filters: { search?: string } = {};
    if (search) filters.search = search;
    fetchWorkspaces({ skip, limit: ITEMS_PER_PAGE, ...filters });
  };

  const handleRefresh = () => {
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;
    const filters: { search?: string } = {};
    if (search) filters.search = search;
    fetchWorkspaces({ skip, limit: ITEMS_PER_PAGE, ...filters });
  };

  return (
    <>
      <AdminHeader title="Workspaces" description="Manage platform workspaces" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Workspace Management</h2>
              <p className="text-sm text-white/50">{total} total workspaces</p>
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

        {/* Search */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              placeholder="Search by name or owner..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/40"
            />
          </div>
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

        {/* Workspace Table */}
        <WorkspaceTable workspaces={workspaces} isLoading={isLoading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-white/50">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} workspaces
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
