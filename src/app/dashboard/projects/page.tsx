
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FolderKanban, PlusCircle, Lightbulb, RefreshCw, Trash2, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Project, ProjectStatus, ProjectResourceRecommendations } from '@/types';
import { getProjectsAction, deleteProjectAction, recommendProjectResourcesAction, updateProjectStatusAction } from '@/app/actions/projects';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AddProjectForm } from '@/components/projects/add-project-form';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

const KANBAN_COLUMNS: ProjectStatus[] = ["To Do", "In Progress", "Testing", "Completed"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [recommendations, setRecommendations] = useState<{ [projectId: string]: ProjectResourceRecommendations | null }>({});
  const [isLoadingRecs, setIsLoadingRecs] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userProjects = await getProjectsAction(user.id);
      setProjects(userProjects);
    } catch(e) {
      toast({ title: "Error", description: "Failed to load projects.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectAdded = () => {
    fetchProjects();
    setShowAddForm(false);
  };

  const handleDeleteProject = async (id: string) => {
    const originalProjects = [...projects];
    setProjects(prev => prev.filter(p => p.id !== id));
    const result = await deleteProjectAction(id);
    if (!result.success) {
      setProjects(originalProjects);
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const handleGetRecommendations = async (projectId: string, projectType: string) => {
    setIsLoadingRecs(projectId);
    try {
      const recs = await recommendProjectResourcesAction(projectType);
      setRecommendations(prev => ({ ...prev, [projectId]: recs }));
    } catch (error) {
      toast({ title: "AI Error", description: "Failed to get recommendations.", variant: "destructive" });
      setRecommendations(prev => ({ ...prev, [projectId]: null }));
    }
    setIsLoadingRecs(null);
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    if (!user) return;
    const originalProjects = projects.map(p => ({...p}));
    
    setProjects(prevProjects => prevProjects.map(p => 
      p.id === projectId ? { ...p, status: newStatus } : p
    ));

    const result = await updateProjectStatusAction(projectId, newStatus, user.id);
    if (!result.success || !result.project) {
      setProjects(originalProjects); 
      toast({ title: "Error", description: result.message || "Failed to update project status.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
      setProjects(prevProjects => prevProjects.map(p => 
        p.id === projectId ? result.project! : p
      ));
    }
  };
  
  const getNeutralStatusSelectStyle = () => {
    return "bg-background border-input text-foreground hover:bg-accent/50 focus:ring-ring";
  };

  const projectStatusesForSelect: ProjectStatus[] = ["Draft", "To Do", "In Progress", "Testing", "Completed"];
  const draftProjects = projects.filter(p => p.status === "Draft");
  const kanbanProjectsByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);


  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <FolderKanban className="mr-3 h-8 w-8 text-primary" /> Projects
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showAddForm ? 'Cancel' : 'Add New Project'}
          </Button>
           <Button onClick={fetchProjects} variant="ghost" size="icon" title="Refresh Projects" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">Track, manage, and receive contextual AI suggestions for your projects.</p>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AddProjectForm onProjectAdded={handleProjectAdded} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && projects.length === 0 && !showAddForm && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Projects Found</h3>
          <p className="text-muted-foreground mt-1">Start by adding your first project.</p>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Project
            </Button>
          )}
        </motion.div>
      )}

      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map(statusColumn => (
            <div key={statusColumn} className="bg-card border border-border rounded-lg p-3 space-y-3 min-h-[200px] shadow-sm">
              <h2 className="text-lg font-semibold text-center py-2 rounded-md bg-secondary text-secondary-foreground border-b border-border">
                {statusColumn} ({kanbanProjectsByStatus[statusColumn]?.length || 0})
              </h2>
              <div className="space-y-3 min-h-[100px]">
                <AnimatePresence>
                {kanbanProjectsByStatus[statusColumn]?.map(project => (
                  <motion.div
                    key={project.id}
                    layout 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow bg-background border-border relative group">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex justify-between items-start gap-1">
                          <CardTitle className="text-base font-semibold text-foreground leading-tight">{project.name}</CardTitle>
                           <Select value={project.status} onValueChange={(newStatus) => handleStatusChange(project.id, newStatus as ProjectStatus)}>
                            <SelectTrigger className={cn("w-auto text-xs h-7 px-2 py-1", getNeutralStatusSelectStyle())}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground min-w-[120px]">
                                {projectStatusesForSelect.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                           </Select>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground pt-0.5">
                          {project.type} • {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow px-3 py-2 space-y-1">
                        {project.description && <p className="text-xs text-foreground/80 mb-2 line-clamp-3">{project.description}</p>}
                         {project.link && (
                          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> Project Link
                          </a>
                        )}
                        {project.testLink && (
                          <a href={project.testLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> Test Link
                          </a>
                        )}
                        {project.documentUrl && (
                          <a href={project.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <FileText className="h-3 w-3 mr-1" /> Document Link
                          </a>
                        )}
                        {recommendations[project.id] && (
                          <div className="mt-2 p-2 bg-secondary/50 rounded-md space-y-1">
                            <h4 className="text-xs font-semibold text-foreground">AI Recs:</h4>
                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                              {recommendations[project.id]?.suggestedTools.slice(0,1).map(tool => <li key={tool.name} className="truncate">{tool.name}</li>)}
                              {recommendations[project.id]?.caseStudies.slice(0,1).map(cs => <li key={cs.name} className="truncate">{cs.name}</li>)}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-between items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
                            onClick={() => handleGetRecommendations(project.id, project.type)}
                            disabled={isLoadingRecs === project.id}
                          >
                            {isLoadingRecs === project.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Lightbulb className="h-3 w-3 mr-1"/>}
                            {recommendations[project.id] ? "Update Recs" : "AI Recs"}
                          </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProject(project.id)} title="Delete Project">
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive"/>
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
                {kanbanProjectsByStatus[statusColumn]?.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No projects in {statusColumn}.</p>
                )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && draftProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <span className="mr-2 px-2 py-0.5 text-sm rounded-md bg-secondary text-secondary-foreground border border-border">Draft</span> 
            Projects ({draftProjects.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {draftProjects.map(project => (
               <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                 <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow bg-background border-border">
                  <CardHeader className="pb-2 pt-3 px-3">
                    <div className="flex justify-between items-start gap-1">
                      <CardTitle className="text-base font-semibold text-foreground leading-tight">{project.name}</CardTitle>
                      <Select value={project.status} onValueChange={(newStatus) => handleStatusChange(project.id, newStatus as ProjectStatus)}>
                        <SelectTrigger className={cn("w-auto text-xs h-7 px-2 py-1", getNeutralStatusSelectStyle())}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground min-w-[120px]">
                            {projectStatusesForSelect.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground pt-0.5">
                      Type: {project.type} • Created {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                   <CardContent className="flex-grow px-3 py-2 space-y-1">
                        {project.description && <p className="text-xs text-foreground/80 mb-2 line-clamp-3">{project.description}</p>}
                         {project.link && (
                          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> Project Link
                          </a>
                        )}
                        {project.testLink && (
                          <a href={project.testLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> Test Link
                          </a>
                        )}
                        {project.documentUrl && (
                          <a href={project.documentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <FileText className="h-3 w-3 mr-1" /> Document Link
                          </a>
                        )}
                        {recommendations[project.id] && (
                          <div className="mt-2 p-2 bg-secondary/50 rounded-md space-y-1">
                            <h4 className="text-xs font-semibold text-foreground">AI Recs:</h4>
                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                              {recommendations[project.id]?.suggestedTools.slice(0,1).map(tool => <li key={tool.name} className="truncate">{tool.name}</li>)}
                              {recommendations[project.id]?.caseStudies.slice(0,1).map(cs => <li key={cs.name} className="truncate">{cs.name}</li>)}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                  <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-between items-center gap-1">
                     <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-primary"
                        onClick={() => handleGetRecommendations(project.id, project.type)}
                        disabled={isLoadingRecs === project.id}
                      >
                        {isLoadingRecs === project.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Lightbulb className="h-3 w-3 mr-1"/>}
                        {recommendations[project.id] ? "Update Recs" : "AI Recs"}
                      </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteProject(project.id)} title="Delete Project">
                      <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive"/>
                    </Button>
                  </CardFooter>
                </Card>
               </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

