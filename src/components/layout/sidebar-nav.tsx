
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, KeyRound, FolderKanban, ShieldCheck, Settings, LogOut, Users, BarChart3, ListChecks, FilePlus, Send, Award, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  userOnly?: boolean;
}

// Standard navigation items for regular users
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/reference-library', label: 'References', icon: BookOpen },
  { href: '/dashboard/repository', label: 'API Keys', icon: KeyRound },
  { href: '/dashboard/tasks', label: 'My Tasks', icon: ListChecks },
];

// Original extended admin items (used when admin is on user-facing dashboard OR if no specific admin menu is defined for a path)
const originalAdminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
];

// New dedicated navigation items for the /admin/* section
const adminSectionNavItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: ShieldCheck },
  { href: '/admin/projects', label: 'Projects Kanban', icon: FolderKanban },
  { href: '/admin/tasks', label: 'Task Management', icon: ListChecks },
  { href: '/admin/performance', label: 'Team Performance', icon: Award },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/repository', label: 'API Keys', icon: KeyRound },
  { href: '/admin/references', label: 'References', icon: BookOpen },
  { href: '/admin/announcements', label: 'Announcements', icon: Send },
  // Settings items
  { href: '/admin/users', label: 'Manage Users', icon: Users },
  { href: '/admin/settings/email', label: 'Email Settings', icon: Mail },
  { href: '/admin/project-starters', label: 'Configure Projects', icon: FilePlus }, // Relabelled
];


export function SidebarNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  let itemsToRender: NavItem[];

  if (user?.isAdmin && pathname.startsWith('/admin')) {
    itemsToRender = adminSectionNavItems;
  } else if (user?.isAdmin) {
    // Admin in non-admin section (e.g. /dashboard)
    // Show user items and a link to Admin Panel
    itemsToRender = [...navItems.filter(item => !item.userOnly), ...originalAdminNavItems];
  } else { // Non-admin user
    itemsToRender = navItems.filter(item => !item.adminOnly);
  }
  
  const uniqueFinalNavItems = itemsToRender.filter((item, index, self) => 
    index === self.findIndex((t) => (
      t.href === item.href && t.label === item.label
    ))
  );


  return (
    <TooltipProvider delayDuration={0}>
    <nav className="flex flex-col h-full">
      <div className="flex-grow space-y-1 px-2 py-4">
        {uniqueFinalNavItems.map((item) => {
          let isActive = pathname === item.href;
          // More specific active state highlighting for nested routes
          if (item.href !== '/admin' && item.href !== '/dashboard' && item.href !== '/') {
             isActive = isActive || pathname.startsWith(item.href + (item.href.endsWith('/') ? '' : '/'));
          }
          // Ensure base /admin or /dashboard isn't active if a sub-route is
          if (item.href === '/admin' && pathname !== '/admin' && pathname.startsWith('/admin/')) {
            isActive = false; 
          }
           if (item.href === '/dashboard' && pathname !== '/dashboard' && pathname.startsWith('/dashboard/')) {
            isActive = false;
          }


          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href} legacyBehavior passHref>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      "w-full justify-start text-sm h-10",
                      isActive && "bg-primary/10 text-primary font-semibold",
                      isCollapsed && "justify-center px-0"
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="bg-card text-foreground border-border">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
      
      <div className="mt-auto p-2 space-y-1 border-t border-border">
         <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sm h-10",
                  isCollapsed && "justify-center px-0"
                )}
                onClick={logout}
              >
                <LogOut className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                {!isCollapsed && <span>Logout</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="bg-card text-foreground border-border">
                Logout
              </TooltipContent>
            )}
          </Tooltip>
      </div>
    </nav>
    </TooltipProvider>
  );
}
