
'use client';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, MessageSquare, UserCircle, Globe } from 'lucide-react'; // Added Globe
import { SidebarNav } from './sidebar-nav'; // For mobile drawer
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { AdminDirectMessageDialog } from '@/components/chat/admin-direct-message-dialog';
import { UserMessagesDialog } from '@/components/chat/user-messages-dialog';
import { useState, useEffect } from 'react';
import { getUnreadMessagesCountAction } from '@/app/actions/directMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onToggleSidebar?: () => void; // For desktop sidebar toggle
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  const [isAdminDmOpen, setIsAdminDmOpen] = useState(false);
  const [isUserMessagesOpen, setIsUserMessagesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  useEffect(() => {
    if (user && !user.isAdmin) {
      const fetchUnread = async () => {
        const count = await getUnreadMessagesCountAction(user.id);
        setUnreadCount(count);
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000); // Poll for unread messages
      return () => clearInterval(interval);
    }
  }, [user]);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 md:px-6 shadow-sm card-grain-overlay">
      <div className="flex items-center">
        {/* Mobile Sidebar Toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden mr-4 shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 w-64 bg-card card-grain-overlay">
            <div className="p-4 border-b">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg text-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>
                WhiteSpace
              </Link>
            </div>
            <SidebarNav isCollapsed={false} />
          </SheetContent>
        </Sheet>
        {/* Desktop Sidebar Toggle (optional, if sidebar is collapsible) */}
        {onToggleSidebar && (
           <Button variant="ghost" size="icon" className="hidden md:flex" onClick={onToggleSidebar}>
             <Menu className="h-5 w-5" />
             <span className="sr-only">Toggle sidebar</span>
           </Button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {user?.isAdmin && (
          <>
            <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => setIsAdminDmOpen(true)}>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Send Direct Message</span>
            </Button>
            <AdminDirectMessageDialog isOpen={isAdminDmOpen} onOpenChange={setIsAdminDmOpen} />
          </>
        )}
        {!user?.isAdmin && user && (
           <>
            <Button variant="ghost" size="icon" className="relative rounded-full" onClick={() => setIsUserMessagesOpen(true)}>
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">View Messages</span>
            </Button>
            <UserMessagesDialog 
              isOpen={isUserMessagesOpen} 
              onOpenChange={setIsUserMessagesOpen} 
              onMessagesRead={() => setUnreadCount(0)} 
            />
          </>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Select language</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border-border card-grain-overlay">
            <DropdownMenuLabel className="text-foreground">Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSelectedLanguage("English")} className={selectedLanguage === "English" ? "bg-accent text-accent-foreground" : ""}>English</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSelectedLanguage("Español")} className={selectedLanguage === "Español" ? "bg-accent text-accent-foreground" : ""}>Español (Placeholder)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSelectedLanguage("Français")} className={selectedLanguage === "Français" ? "bg-accent text-accent-foreground" : ""}>Français (Placeholder)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="h-8 w-8">
          {user?.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.name} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {user ? getInitials(user.name) : <UserCircle className="h-5 w-5"/>}
          </AvatarFallback>
        </Avatar>

      </div>
    </header>
  );
}
