
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, PlusCircle, RefreshCw, Trash2, ExternalLink, CalendarDays, UserCircle, Users, FolderKanban } from 'lucide-react'; 
import { useAuth } from '@/context/auth-context';
import type { Task, TaskStatus } from '@/types';
import { getTasksForAdminAction, deleteTaskAction, updateTaskStatusAction } from '@/app/actions/tasks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AddTaskForm } from '@/components/tasks/add-task-form';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

const KANBAN_COLUMNS_ADMIN: TaskStatus[] = ["To Do", "In Progress", "Blocked", "Completed"];


export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const { user } = useAuth(); 
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!user || !user.isAdmin) return;
    setIsLoading(true);
    try {
      const adminTasks = await getTasksForAdminAction(user.id);
      setTasks(adminTasks);
    } catch(e) {
      toast({ title: "Error", description: "Failed to load tasks.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskAdded = () => {
    fetchTasks();
    setShowAddForm(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    const result = await deleteTaskAction(id, user.id);
    if (!result.success) {
      setTasks(originalTasks);
      toast({ title: "Error", description: result.message || "Failed to delete task.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!user) return;
    const originalTasks = tasks.map(t => ({...t})); 
    
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    const result = await updateTaskStatusAction(taskId, newStatus, user.id);
    if (!result.success || !result.task) {
      setTasks(originalTasks);
      toast({ title: "Error", description: result.message || "Failed to update status.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
      fetchTasks(); // Re-fetch to ensure correct column placement and data consistency
    }
  };
  
  const getStatusColorSelect = (status: TaskStatus) => {
     switch (status) {
      case "To Do": return "bg-slate-200/60 text-slate-800 border-slate-400/50 hover:bg-slate-300/80";
      case "In Progress": return "bg-blue-200/60 text-blue-800 border-blue-400/50 hover:bg-blue-300/80";
      case "Completed": return "bg-green-200/60 text-green-800 border-green-400/50 hover:bg-green-300/80";
      case "Blocked": return "bg-red-200/60 text-red-800 border-red-400/50 hover:bg-red-300/80";
      default: return "bg-background border-input text-foreground hover:bg-accent/50 focus:ring-ring";
    }
  };

  const taskStatusesForSelect: TaskStatus[] = ["To Do", "In Progress", "Completed", "Blocked"];
  const tasksByStatus = KANBAN_COLUMNS_ADMIN.reduce((acc, status) => {
    acc[status] = tasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);


  if (!user || !user.isAdmin) { 
      return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Verifying admin access...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <ListChecks className="mr-3 h-8 w-8 text-primary" /> Task Management
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showAddForm ? 'Cancel' : 'Add New Task'}
          </Button>
           <Button onClick={fetchTasks} variant="ghost" size="icon" title="Refresh Tasks" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">Create, assign, and track tasks for your team.</p>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <AddTaskForm onTaskAdded={handleTaskAdded} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && !showAddForm && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Tasks Found</h3>
          <p className="text-muted-foreground mt-1">Start by adding and assigning the first task.</p>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Task
            </Button>
          )}
        </motion.div>
      )}

      {!isLoading && tasks.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS_ADMIN.map(statusColumn => (
            <div key={statusColumn} className="bg-card border border-border rounded-lg p-3 space-y-3 min-h-[200px] shadow-sm">
              <h2 className="text-lg font-semibold text-center py-2 rounded-md bg-secondary text-secondary-foreground border-b border-border">
                {statusColumn} ({tasksByStatus[statusColumn]?.length || 0})
              </h2>
              <div className="space-y-3 min-h-[100px]">
                <AnimatePresence>
                {tasksByStatus[statusColumn]?.map(task => (
                  <motion.div
                    key={task.id}
                    layout 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow bg-background border-border relative group">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex justify-between items-start gap-1">
                          <CardTitle className="text-base font-semibold text-foreground leading-tight">{task.title}</CardTitle>
                           <Select value={task.status} onValueChange={(newStatus) => handleStatusChange(task.id, newStatus as TaskStatus)}>
                            <SelectTrigger className={cn("w-auto text-xs h-7 px-2 py-1", getStatusColorSelect(task.status))}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover text-popover-foreground min-w-[120px]">
                                {taskStatusesForSelect.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                           </Select>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground pt-0.5 space-y-0.5">
                          <span className="flex items-center"><Users className="h-3 w-3 mr-1 text-muted-foreground"/>To: {(task.assignedToUserNames && task.assignedToUserNames.length > 0) ? task.assignedToUserNames.join(', ') : 'N/A'}</span>
                          <span className="flex items-center"><UserCircle className="h-3 w-3 mr-1 text-muted-foreground"/>By: {task.assignedByUserName || 'N/A'}</span>
                          <span className="flex items-center"><CalendarDays className="h-3 w-3 mr-1 text-muted-foreground"/>Created: {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true })}</span>
                          {task.dueDate && isValid(parseISO(task.dueDate)) && <span className="flex items-center"><CalendarDays className="h-3 w-3 mr-1 text-primary"/>Due: {format(parseISO(task.dueDate), "MMM d, yyyy")}</span>}
                          {task.projectName && <span className="flex items-center"><FolderKanban className="h-3 w-3 mr-1 text-muted-foreground"/>Project: {task.projectName}</span>}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow px-3 py-2 space-y-1">
                        {task.description && <p className="text-xs text-foreground/80 mb-2 line-clamp-3">{task.description}</p>}
                        {task.referenceUrl && (
                          <a href={task.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center">
                            <ExternalLink className="h-3 w-3 mr-1" /> Reference Link
                          </a>
                        )}
                      </CardContent>
                      <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-end items-center gap-1 mt-auto">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTask(task.id)} title="Delete Task">
                          <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive"/>
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
                {tasksByStatus[statusColumn]?.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No tasks in {statusColumn}.</p>
                )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

