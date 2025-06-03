
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, RefreshCw } from 'lucide-react'; // Removed unused icons like Trash2
import { useAuth } from '@/context/auth-context';
import type { Reference } from '@/types';
import { getReferences, deleteReferenceAction } from '@/app/actions/references';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
// import { formatDistanceToNow, parseISO } from 'date-fns'; // Not used directly here, but in ReferenceItem
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Use MOCK_USERS_ARRAY_FOR_SELECT from AuthContext
import { useRouter } from 'next/navigation';
import { ReferenceItem } from '@/components/reference-library/reference-item';

export default function AdminReferencesPage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const fetchReferences = useCallback(async () => {
    if (!user || !user.isAdmin) return;
    setIsLoading(true);
    try {
      const allRefs = await getReferences(user.id); // Admin ID fetches all
      setReferences(allRefs);
    } catch (error) {
      console.error("Failed to fetch references:", error);
      toast({ title: "Error", description: "Could not load references.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.isAdmin) {
        router.replace('/dashboard');
      } else {
        fetchReferences();
      }
    }
  }, [user, authLoading, router, fetchReferences]);

  const handleDeleteReference = async (id: string) => {
    if (!user || !user.isAdmin) return;
    const originalReferences = [...references];
    setReferences(prev => prev.filter(ref => ref.id !== id));
    const result = await deleteReferenceAction(id, user.id); // Pass admin ID for potential RLS checks
    if (!result.success) {
      setReferences(originalReferences);
      toast({ title: "Error", description: result.message || "Failed to delete reference.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };
  
  const getUserName = (userId: string): string => {
    const refOwner = MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === userId);
    return refOwner ? refOwner.name : 'Unknown User';
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-theme(space.32))]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !user.isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <BookOpen className="mr-3 h-8 w-8 text-primary" /> Admin: All References
        </h1>
        <Button onClick={fetchReferences} variant="ghost" size="icon" title="Refresh References" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-muted-foreground">View and manage all references saved by users across the platform.</p>

      {references.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No References Found</h3>
          <p className="text-muted-foreground mt-1">There are currently no references in the system.</p>
        </motion.div>
      )}

      {references.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {references.map(ref => (
               <motion.div
                key={ref.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ReferenceItem 
                  reference={{...ref, userId: getUserName(ref.userId)}} // Pass enriched user name
                  onDelete={handleDeleteReference} 
                  isAdminView={true} 
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
