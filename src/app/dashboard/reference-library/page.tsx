
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AddReferenceForm } from '@/components/reference-library/add-reference-form';
import { ReferenceItem } from '@/components/reference-library/reference-item';
import { getReferences, deleteReferenceAction, getAISuggestedReferences } from '@/app/actions/references';
import type { Reference } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, PlusCircle, Lightbulb, RefreshCw, BookOpen } from 'lucide-react'; // Added BookOpen
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_TAGS_VALUE = "__ALL_TAGS_SENTINEL__"; // Sentinel value for "All Tags"

export default function ReferenceLibraryPage() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [aiSuggested, setAiSuggested] = useState<Reference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState(''); // Empty string means "All Tags"
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchReferences = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userRefs = await getReferences(user.id);
      setReferences(userRefs);
      // const suggested = await getAISuggestedReferences('some-project-id', userRefs); // TODO: Pass actual project context
      // setAiSuggested(suggested);
    } catch (error) {
      console.error("Failed to fetch references:", error);
      toast({ title: "Error", description: "Could not load references.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  const handleReferenceAdded = () => {
    fetchReferences(); // Refresh list after adding
    setShowAddForm(false); // Optionally hide form after adding
  };

  const handleDeleteReference = async (id: string) => {
    const originalReferences = [...references];
    setReferences(prev => prev.filter(ref => ref.id !== id)); // Optimistic update
    const result = await deleteReferenceAction(id);
    if (!result.success) {
      setReferences(originalReferences); // Revert on failure
      toast({ title: "Error", description: "Failed to delete reference.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const handleTagFilterChange = (selectedValue: string) => {
    if (selectedValue === ALL_TAGS_VALUE) {
      setFilterTag(''); // Reset to empty string for "All Tags"
    } else {
      setFilterTag(selectedValue);
    }
  };

  const filteredReferences = references
    .filter(ref => 
      ref.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.link.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(ref => 
      filterTag ? ref.tags?.includes(filterTag) : true
    );
  
  const allTags = Array.from(new Set(references.flatMap(ref => ref.tags || [])));

  if (!user) return null; // AuthProvider handles redirect, this is for type safety

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground">Reference Library</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showAddForm ? 'Cancel' : 'Add New Reference'}
          </Button>
           <Button onClick={fetchReferences} variant="ghost" size="icon" title="Refresh References" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AddReferenceForm onReferenceAdded={handleReferenceAdded} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Input
            type="search"
            placeholder="Search references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-input-border"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
        <Select 
          value={filterTag === '' ? ALL_TAGS_VALUE : filterTag} 
          onValueChange={handleTagFilterChange}
        >
          <SelectTrigger className="bg-input border-input-border">
            <SelectValue placeholder="Filter by tag..." />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border-border">
            <SelectItem value={ALL_TAGS_VALUE}>All Tags</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredReferences.length === 0 && !showAddForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No References Found</h3>
          <p className="text-muted-foreground mt-1">
            {searchTerm || filterTag ? "Try adjusting your search or filters." : "Start by adding your first reference link."}
          </p>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Reference
            </Button>
          )}
        </motion.div>
      )}
      
      {/* User's References */}
      {filteredReferences.length > 0 && (
        <div className="space-y-4">
           <h2 className="text-xl font-semibold text-foreground">Your Saved References</h2>
            <AnimatePresence>
              {filteredReferences.map(ref => (
                <ReferenceItem key={ref.id} reference={ref} onDelete={handleDeleteReference} />
              ))}
            </AnimatePresence>
        </div>
      )}

      {/* AI Suggested References (Placeholder) */}
      {aiSuggested.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-primary" />
            AI Suggestions
          </h2>
          <AnimatePresence>
            {aiSuggested.map(ref => (
              <ReferenceItem key={ref.id} reference={ref} onDelete={() => { /* AI suggestions might not be deletable or handle differently */ }} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
