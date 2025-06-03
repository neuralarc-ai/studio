'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Header } from '@/components/layout/header';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.replace('/dashboard'); // Or /auth/login if you prefer
    }
  }, [user, loading, router]);


  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  if (loading || !user || !user.isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const sidebarWidth = isSidebarCollapsed ? "w-16" : "w-64";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className={cn(
        "hidden md:flex flex-col border-r border-border bg-card text-foreground transition-all duration-300 ease-in-out",
        sidebarWidth
      )}>
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
           <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg text-primary">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-all", isSidebarCollapsed ? "h-7 w-7" : "h-6 w-6")}><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>
            {!isSidebarCollapsed && <span>WhiteSpace</span>}
          </Link>
        </div>
        <SidebarNav isCollapsed={isSidebarCollapsed} />
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-full mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
