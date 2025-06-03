
'use client';

import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addTaskAction } from '@/app/actions/tasks';
import { getProjectsAction } from '@/app/actions/projects';
import { useEffect, useRef, useState, useActionState as useReactActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle, CalendarIcon, FolderKanban, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus, User as AuthUserType, Project } from '@/types';
import { useAuth } from '@/context/auth-context'; 

const initialState = {
  message: '',
  task: null,
  errors: null,
};

// Sentinel value for when "None" project is selected
const NO_PROJECT_SENTINEL = "_NO_PROJECT_";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Add Task
    </Button>
  );
}

const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "Completed", "Blocked"];

export function AddTaskForm({ onTaskAdded }: { onTaskAdded: () => void }) {
  const { user, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); 
  const boundAddTaskAction = user ? addTaskAction.bind(null, user.id) : null;

  const [state, formAction] = useReactActionState(
    boundAddTaskAction || ((p:any, f:any) => Promise.resolve({message: 'User not authenticated', errors: {form:['Admin/User not authenticated.']}, task: null})),
    initialState
  );

  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(NO_PROJECT_SENTINEL); 

  const assignableUsers = MOCK_USERS_ARRAY_FOR_SELECT.filter(u => !u.isAdmin); 

  useEffect(() => {
    async function fetchProjectsForAdmin() {
      if (user?.isAdmin) { 
        try {
          const allProjects = await getProjectsAction('admin-1'); 
          setProjects(allProjects);
        } catch (error) {
          console.error("Failed to fetch projects for task form:", error);
          toast({ title: "Error", description: "Could not load projects for selection.", variant: "destructive" });
        }
      }
    }
    fetchProjectsForAdmin();
  }, [user, toast]);

  useEffect(() => {
    if (state.message && !state.errors && state.task) {
      toast({ title: "Success", description: state.message, variant: "default" });
      onTaskAdded();
      formRef.current?.reset();
      setSelectedUserIds([]);
      setDueDate(undefined);
      setStatus('To Do');
      setSelectedProjectId(NO_PROJECT_SENTINEL); 
    } else if (state.message && state.errors) {
      const errorMessages = Object.values(state.errors || {}).flat().join(', ');
      toast({ title: "Error", description: state.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (state.message && !state.task && !state.errors) { 
       toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onTaskAdded]);
  
  const handleUserSelectionChange = (userId: string) => {
    setSelectedUserIds(prevSelectedUserIds =>
      prevSelectedUserIds.includes(userId)
        ? prevSelectedUserIds.filter(id => id !== userId)
        : [...prevSelectedUserIds, userId]
    );
  };

  if (!user || !user.isAdmin || !boundAddTaskAction) {
     return (
      <Card className="w-full shadow-lg bg-card border-border">
        <CardHeader><CardTitle className="text-xl font-headline text-destructive">Error</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Admin not authenticated. Cannot add task.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-foreground">Add New Task</CardTitle>
        <CardDescription className="text-muted-foreground">
          Assign a task with relevant details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-foreground">Task Title*</Label>
            <Input id="title" name="title" placeholder="e.g., Finalize report presentation" required className="bg-input border-input-border" />
            {state.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title[0]}</p>}
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
            <Textarea id="description" name="description" placeholder="Provide more details about the task..." className="min-h-[100px] bg-input border-input-border"/>
          </div>
          
          <div>
            <Label className="text-foreground mb-1 block">Assign To* (select one or more)</Label>
            <ScrollArea className="h-32 w-full rounded-md border border-input-border p-2 bg-input">
              <div className="space-y-1.5">
                {assignableUsers.map(u => (
                  <div key={u.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${u.id}`}
                      name="assignedToUserIds" 
                      value={u.id}
                      checked={selectedUserIds.includes(u.id)}
                      onCheckedChange={() => handleUserSelectionChange(u.id)}
                    />
                    <Label htmlFor={`user-${u.id}`} className="text-sm font-normal text-foreground cursor-pointer">
                      {u.name} ({u.pinFirstTwo}**)
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {state.errors?.assignedToUserIds && <p className="text-sm text-destructive mt-1">{state.errors.assignedToUserIds[0]}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <Label htmlFor="status" className="text-foreground">Status*</Label>
              <Select name="status" required value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger className="w-full bg-input border-input-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border">
                  {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="projectId" className="text-foreground">Link to Project (Optional)</Label>
              <Select name="projectId" value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full bg-input border-input-border">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
                  <SelectItem value={NO_PROJECT_SENTINEL}>None</SelectItem>
                  {projects.map(proj => (
                    <SelectItem key={proj.id} value={proj.id}><FolderKanban className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>{proj.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.projectId && <p className="text-sm text-destructive mt-1">{state.errors.projectId[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate" className="text-foreground">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-input border-input-border",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                </PopoverContent>
              </Popover>
              {dueDate && <input type="hidden" name="dueDate" value={dueDate.toISOString()} />}
            </div>
            <div>
                <Label htmlFor="referenceUrl" className="text-foreground">Reference URL (Optional)</Label>
                <Input id="referenceUrl" name="referenceUrl" type="url" placeholder="https://example.com/doc" className="bg-input border-input-border"/>
                {state.errors?.referenceUrl && <p className="text-sm text-destructive mt-1">{state.errors.referenceUrl[0]}</p>}
            </div>
          </div>
          
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
