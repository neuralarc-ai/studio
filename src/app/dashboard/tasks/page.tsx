
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ListChecks, PlusCircle, RefreshCw, ExternalLink, CalendarDays, UserCircle, FolderKanban, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Task, TaskStatus } from '@/types';
import { getTasksForUserAction, updateTaskStatusAction } from '@/app/actions/tasks';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
// Placeholder for UserAddTaskForm - will be created in a follow-up
// import { UserAddTaskForm } from '@/components/tasks/user-add-task-form';

const KANBAN_COLUMNS: TaskStatus[] = ["To Do", "In Progress", "Blocked", "Completed"]; // "Testing" status can be added if needed.

export default function UserTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserAddTaskForm, setShowUserAddTaskForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userTasks = await getTasksForUserAction(user.id);
      setTasks(userTasks);
    } catch(e) {
      toast({ title: "Error", description: "Failed to load your tasks.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskAdded = () => {
    fetchTasks();
    setShowUserAddTaskForm(false); // Close form after adding
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
      toast({ title: "Error", description: result.message || "Failed to update task status.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
      // Re-fetch to ensure order and all data is fresh, or update locally carefully
      fetchTasks(); 
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
  
  const taskStatusesForSelect: TaskStatus[] = ["To Do", "In Progress", "Blocked", "Completed"];
  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);


  if (!user) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <ListChecks className="mr-3 h-8 w-8 text-primary" /> My Tasks
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowUserAddTaskForm(!showUserAddTaskForm)} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <PlusCircle className="mr-2 h-4 w-4" /> {showUserAddTaskForm ? 'Cancel' : 'Add New Task'}
          </Button>
           <Button onClick={fetchTasks} variant="ghost" size="icon" title="Refresh Tasks" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">View tasks assigned to you and manage their status. You can also add new tasks for the team.</p>

      <AnimatePresence>
        {showUserAddTaskForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Placeholder for UserAddTaskForm. Next step will be to implement this form. */}
            <Card className="w-full shadow-lg bg-card border-border">
                <CardHeader><CardTitle>Add New Task Form (Coming Soon)</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">The form to add new tasks will be implemented here, allowing you to assign to multiple team members.</p></CardContent>
            </Card>
            {/* <UserAddTaskForm onTaskAdded={handleTaskAdded} /> */}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && !showUserAddTaskForm && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-card">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Tasks Found</h3>
          <p className="text-muted-foreground mt-1">You have no tasks assigned to you, or none match current filters.</p>
          {!showUserAddTaskForm && (
            <Button onClick={() => setShowUserAddTaskForm(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Task
            </Button>
          )}
        </motion.div>
      )}

      {!isLoading && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map(statusColumn => (
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
                          <span className="flex items-center"><UserCircle className="h-3 w-3 mr-1 text-muted-foreground"/>Assigned by: {task.assignedByUserName || 'N/A'}</span>
                          { (task.assignedToUserNames && task.assignedToUserNames.length > 1) &&
                            <span className="flex items-center"><Users className="h-3 w-3 mr-1 text-muted-foreground"/>Also with: {task.assignedToUserNames.filter(name => name !== user.name).join(', ') || 'N/A'}</span>
                          }
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
                       {/* User delete task functionality might be added later. For now, users only update status. */}
                       {/* <CardFooter className="px-3 pt-2 pb-3 flex flex-row justify-end items-center gap-1"></CardFooter> */}
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

