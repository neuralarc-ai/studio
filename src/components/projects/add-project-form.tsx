
'use client';

import { useFormStatus } from 'react-dom'; 
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addProjectAction, getProjectStartersAction } from '@/app/actions/projects';
import { useEffect, useRef, useState, useActionState as useReactActionState } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, ProjectStatus, ProjectStarter } from '@/types';
import { useAuth } from '@/context/auth-context';

const initialState = {
  message: '',
  project: null,
  errors: null,
};

const NO_STARTER_SELECTED_SENTINEL = "_NO_STARTER_"; // Sentinel for "None" option

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Add Project
    </Button>
  );
}

const projectTypes = ["Web Application", "Mobile App", "Data Analysis", "AI Model", "Game Development", "Other"];
const projectDisplayStatuses: ProjectStatus[] = ["Draft", "To Do", "In Progress", "Testing", "Completed"];

export function AddProjectForm({ onProjectAdded }: { onProjectAdded: () => void }) {
  const { user } = useAuth();
  const boundAddProjectAction = user ? addProjectAction.bind(null, user.id) : null;
  
  const [state, formAction] = useReactActionState(
    boundAddProjectAction || ((p:any, f:any) => Promise.resolve({message: 'User not available', errors: {form:['User not authenticated.']}, project: null})), 
    initialState
  );
  
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus>('Draft');
  const [projectStarters, setProjectStarters] = useState<ProjectStarter[]>([]);
  const [selectedStarterId, setSelectedStarterId] = useState<string>(NO_STARTER_SELECTED_SENTINEL);


  useEffect(() => {
    async function fetchStarters() {
      try {
        const starters = await getProjectStartersAction();
        setProjectStarters(starters);
      } catch (error) {
        console.error("Failed to fetch project starters:", error);
        toast({ title: "Error", description: "Could not load project starters.", variant: "destructive" });
      }
    }
    fetchStarters();
  }, [toast]);

  useEffect(() => {
    if (state.message && !state.errors && state.project) {
      toast({ title: "Success", description: state.message, variant: "default" });
      onProjectAdded();
      formRef.current?.reset();
      setProjectName('');
      setProjectDescription('');
      setSelectedType('');
      setSelectedStatus('Draft');
      setSelectedStarterId(NO_STARTER_SELECTED_SENTINEL);
    } else if (state.message && state.errors) {
      const errorMessages = Object.values(state.errors || {}).flat().join(', ');
      toast({ title: "Error", description: state.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (state.message && !state.project && !state.errors){ 
       toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onProjectAdded]);

  const handleStarterChange = (starterId: string) => {
    setSelectedStarterId(starterId);
    if (starterId === NO_STARTER_SELECTED_SENTINEL) {
      setProjectName('');
      setProjectDescription('');
    } else {
      const selected = projectStarters.find(s => s.id === starterId);
      if (selected) {
        setProjectName(selected.title);
        setProjectDescription(selected.description);
      }
    }
  };

  if (!user || !boundAddProjectAction) {
    return (
      <Card className="w-full shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User not authenticated. Cannot add project.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-foreground">Add New Project</CardTitle>
        <CardDescription className="text-muted-foreground">
          Provide details for your new project. You can select a starter or define custom details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="projectStarterId" className="text-foreground">Choose a Starter (Optional)</Label>
            <Select value={selectedStarterId} onValueChange={handleStarterChange} name="projectStarterId">
              <SelectTrigger className="w-full bg-input border-input-border">
                <SelectValue placeholder="Select a project starter..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                <SelectItem value={NO_STARTER_SELECTED_SENTINEL}>None - Custom Project</SelectItem>
                {projectStarters.map(starter => (
                  <SelectItem key={starter.id} value={starter.id}>{starter.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name" className="text-foreground">Project Name*</Label>
            <Input id="name" name="name" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., Company Website Redesign" required className="bg-input border-input-border" />
            {state.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type" className="text-foreground">Project Type*</Label>
              <Select name="type" required value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full bg-input border-input-border">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border">
                  {projectTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
              {state.errors?.type && <p className="text-sm text-destructive mt-1">{state.errors.type[0]}</p>}
            </div>
            <div>
              <Label htmlFor="status" className="text-foreground">Status*</Label>
              <Select name="status" required value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ProjectStatus)}>
                <SelectTrigger className="w-full bg-input border-input-border">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border">
                  {projectDisplayStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
              {state.errors?.status && <p className="text-sm text-destructive mt-1">{state.errors.status[0]}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
            <Textarea id="description" name="description" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Briefly describe the project..." className="min-h-[100px] bg-input border-input-border"/>
             {state.errors?.description && <p className="text-sm text-destructive mt-1">{Array.isArray(state.errors.description) ? state.errors.description[0] : String(state.errors.description)}</p>}
          </div>

          <div>
            <Label htmlFor="link" className="text-foreground">Project Link (Optional)</Label>
            <Input id="link" name="link" type="url" placeholder="https://yourproject.com" className="bg-input border-input-border"/>
             {state.errors?.link && <p className="text-sm text-destructive mt-1">{Array.isArray(state.errors.link) ? state.errors.link[0] : String(state.errors.link)}</p>}
          </div>

          <div>
            <Label htmlFor="testLink" className="text-foreground">Test Link (Optional)</Label>
            <Input id="testLink" name="testLink" type="url" placeholder="https://test.yourproject.com" className="bg-input border-input-border"/>
            {state.errors?.testLink && <p className="text-sm text-destructive mt-1">{Array.isArray(state.errors.testLink) ? state.errors.testLink[0] : String(state.errors.testLink)}</p>}
          </div>

          <div>
            <Label htmlFor="documentUrl" className="text-foreground">Document URL (Optional)</Label>
            <Input id="documentUrl" name="documentUrl" type="url" placeholder="https://docs.google.com/document/d/..." className="bg-input border-input-border"/>
            {state.errors?.documentUrl && <p className="text-sm text-destructive mt-1">{Array.isArray(state.errors.documentUrl) ? state.errors.documentUrl[0] : String(state.errors.documentUrl)}</p>}
          </div>
          
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
