'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Users,
  Building2,
  LayoutDashboard,
  Cpu,
  ArrowLeft,
  Shield,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'System overview and metrics',
    exact: true,
  },
  {
    label: 'AI Models',
    href: '/admin/models',
    icon: Cpu,
    description: 'Configure AI model defaults',
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Manage platform users',
  },
  {
    label: 'Workspaces',
    href: '/admin/workspaces',
    icon: Building2,
    description: 'Manage workspaces',
  },
  {
    label: 'Messages',
    href: '/admin/messages',
    icon: MessageSquare,
    description: 'System announcements',
  },
  {
    label: 'Memory',
    href: '/admin/memory',
    icon: Brain,
    description: 'AI memory system',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration',
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Admin Panel</h1>
            <p className="text-xs text-white/50">System Administration</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminNavItems.map((item) => {
            const isActive = 'exact' in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-blue-400' : 'text-white/50 group-hover:text-white/70'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to App</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
