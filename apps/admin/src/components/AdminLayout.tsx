import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Building2,
  Cpu,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Workspaces', href: '/workspaces', icon: Building2 },
  { label: 'Models', href: '/models', icon: Cpu },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const pathname = location.pathname;

  function isActive(href: string) {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--surface-primary)' }}>
      {/* Sidebar */}
      <aside className="flex w-64 flex-col" style={{ backgroundColor: 'var(--surface-secondary)', borderRight: '1px solid var(--border-primary)' }}>
        {/* Logo / Brand */}
        <div className="flex h-14 items-center px-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>XTYL Admin</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                )}
                style={active ? {
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                } : {
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-tertiary)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto scrollbar-thin p-8">
        {children}
      </main>
    </div>
  );
}
