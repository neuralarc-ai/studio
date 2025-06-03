
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, RefreshCw, Trash2, FolderPlus, UserCircle, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Project, ProjectStatus } from '@/types';
import { getProjectsAction, deleteProjectAction } from '@/app/actions/projects';
import { AddProjectForm } from '@/components/projects/add-project-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow, parseISO } from 'date-fns';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Use MOCK_USERS_ARRAY_FOR_SELECT from AuthContext
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';


export default function ConfigureProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { user, loading: authLoading, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    if (!user || !user.isAdmin) return;
    setIsLoading(true);
    try {
      const allProjects = await getProjectsAction(user.id); 
      setProjects(allProjects);
    } catch(e) {
      toast({ title: "Error", description: "Failed to load projects.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.isAdmin) {
        router.replace('/dashboard');
      } else {
        fetchProjects();
      }
    }
  }, [user, authLoading, router, fetchProjects]);

  const handleProjectAdded = () => {
    fetchProjects();
    setShowAddForm(false);
  };

  const handleDeleteProject = async (id: string) => {
    if (!user || !user.isAdmin) return;
    const originalProjects = [...projects];
    setProjects(prev => prev.filter(p => p.id !== id));
    const result = await deleteProjectAction(id); // No userId needed for admin delete
    if (!result.success) {
      setProjects(originalProjects);
      toast({ title: "Error", description: result.message || "Failed to delete project.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const getUserName = (userId: string) => {
    const projectUser = MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === userId);
    return projectUser ? projectUser.name : 'Unknown User';
  };

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "Draft": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
      case "In Progress": return "bg-blue-500/20 text-blue-700 border-blue-500/50";
      case "Completed": return "bg-green-500/20 text-green-700 border-green-500/50";
      case "To Do": return "bg-gray-500/20 text-gray-700 border-gray-500/50";
      case "Testing": return "bg-purple-500/20 text-purple-700 border-purple-500/50";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  if (authLoading || (!user || !user.isAdmin)) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Verifying admin access...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <FolderPlus className="mr-3 h-8 w-8 text-primary" /> Configure Projects
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showAddForm ? 'Cancel Adding' : 'Add New Project'}
          </Button>
          <Button onClick={fetchProjects} variant="ghost" size="icon" title="Refresh Projects" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">Manage all projects in the system. These projects will be available for selection when assigning tasks.</p>

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

      {isLoading && <div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}

      {!isLoading && projects.length === 0 && !showAddForm && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg">
          <FolderPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Projects Found</h3>
          <p className="text-muted-foreground mt-1">Create the first project to make it available for task assignments.</p>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Project
            </Button>
          )}
        </motion.div>
      )}

      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {projects.map(project => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow bg-card border-border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-foreground">{project.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(project.status)}>{project.status}</Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground pt-1 space-y-0.5">
                        <div className="flex items-center"><UserCircle className="h-3 w-3 mr-1"/>Owner: {getUserName(project.userId)}</div>
                        <div>Type: {project.type}</div>
                        <div>Created {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}</div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-foreground/80 whitespace-pre-line line-clamp-3">{project.description || "No description."}</p>
                      <div className="mt-2 space-y-1">
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
                      </div>
                  </CardContent>
                  <CardFooter className="mt-auto flex justify-end items-center gap-2 pt-4">
                     <Button variant="outline" size="sm" onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5"/> Delete
                     </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
