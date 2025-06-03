
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FolderKanban, RefreshCw, Trash2, ExternalLink, FileText, UserCircle, TrendingUp, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Project, ProjectStatus } from '@/types';
import { getProjectsAction, deleteProjectAction, updateProjectStatusAction } from '@/app/actions/projects';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Use MOCK_USERS_ARRAY_FOR_SELECT from AuthContext
import { useRouter } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent, ChartTooltip } from '@/components/ui/chart'; // Added ChartTooltip
import { Alert, AlertDescription } from '@/components/ui/alert';

const KANBAN_COLUMNS: ProjectStatus[] = ["To Do", "In Progress", "Testing", "Completed"];
const DRAFT_COLUMN_LABEL = "Draft"; 

const projectStatusesForSelect: ProjectStatus[] = ["Draft", "To Do", "In Progress", "Testing", "Completed"];

const mockCompletionPathData = [
  { name: 'Jan', actual: 10, predicted: 12, ideal: 15 },
  { name: 'Feb', actual: 25, predicted: 28, ideal: 30 },
  { name: 'Mar', actual: 40, predicted: 45, ideal: 45 },
  { name: 'Apr', actual: 55, predicted: 60, ideal: 60 },
  { name: 'May', actual: null, predicted: 75, ideal: 75 },
  { name: 'Jun', actual: null, predicted: 90, ideal: 90 },
  { name: 'Jul', actual: null, predicted: 100, ideal: 100 },
];

const chartConfigStatus = {
  count: { label: "Projects", color: "hsl(var(--chart-1))" },
};
const chartConfigPath = {
  actual: { label: "Actual Progress", color: "hsl(var(--chart-1))" },
  predicted: { label: "Predicted Progress", color: "hsl(var(--chart-2))" },
  ideal: { label: "Ideal Path", color: "hsl(var(--chart-3))" },
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    if (!user || !user.isAdmin) return;
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
  
  const draftProjects = projects.filter(p => p.status === "Draft");
  const kanbanProjectsByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);

  const projectStatusDistribution = projectStatusesForSelect.map(status => ({
    status,
    count: projects.filter(p => p.status === status).length,
  })).filter(s => s.count > 0);

  const getUserName = (userId: string) => {
    const projectUser = MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === userId);
    return projectUser ? projectUser.name : 'Unknown User';
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
          <FolderKanban className="mr-3 h-8 w-8 text-primary" /> Admin: Projects Kanban & Insights
        </h1>
        <div className="flex gap-2">
           <Button onClick={fetchProjects} variant="ghost" size="icon" title="Refresh Projects" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">View all projects, manage their status, and get insights into project distribution and progress.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">Project Status Distribution</CardTitle>
            <CardDescription className="text-muted-foreground">Current count of projects by status.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            {projects.length > 0 ? (
              <ChartContainer config={chartConfigStatus} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusDistribution} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="status" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                    <ChartTooltip content={<ChartTooltipContent />} cursorStyle={{ fill: "hsla(var(--background), 0.5)" }}/>
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-10">No project data to display for status distribution.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary"/> Conceptual Completion Path
            </CardTitle>
            <CardDescription className="text-muted-foreground">Illustrative progress and prediction (mock data).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ChartContainer config={chartConfigPath} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockCompletionPathData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                    <YAxis unit="%" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                    <ChartTooltip content={<ChartTooltipContent />} cursorStyle={{ stroke: "hsl(var(--accent))", strokeWidth: 1.5 }} />
                    <ChartLegendContent />
                    <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-actual)" }} activeDot={{ r: 6 }}/>
                    <Line type="monotone" dataKey="predicted" stroke="var(--color-predicted)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: "var(--color-predicted)" }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} activeDot={false} />
                </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
             <Alert variant="default" className="mt-3 text-xs bg-secondary/50 border-border">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription>
                    This chart is for demonstration purposes only. Actual completion path tracking and AI-powered prediction would require historical data and significant backend development.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>


      {projects.length === 0 && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Projects Found</h3>
          <p className="text-muted-foreground mt-1">There are currently no projects in the system. Add projects via "Configure Projects".</p>
        </motion.div>
      )}

      {projects.length > 0 && (
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
                        <CardDescription className="text-xs text-muted-foreground pt-0.5 space-y-0.5">
                          <div className="flex items-center"><UserCircle className="h-3 w-3 mr-1 text-muted-foreground"/>Owner: {getUserName(project.userId)}</div>
                          <div>Type: {project.type}</div>
                          <div>Created: {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}</div>
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
                      </CardContent>
                      <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-end items-center gap-1">
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
      
      {draftProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center">
            <span className="mr-2 px-2 py-0.5 text-sm rounded-md bg-secondary text-secondary-foreground border border-border">{DRAFT_COLUMN_LABEL}</span> 
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
                     <CardDescription className="text-xs text-muted-foreground pt-0.5 space-y-0.5">
                        <div className="flex items-center"><UserCircle className="h-3 w-3 mr-1 text-muted-foreground"/>Owner: {getUserName(project.userId)}</div>
                        <div>Type: {project.type}</div>
                        <div>Created: {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}</div>
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
                      </CardContent>
                  <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-end items-center gap-1">
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
