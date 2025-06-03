
'use client';

import { useFormStatus } from 'react-dom'; 
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addApiKeyAction } from '@/app/actions/repository';
import { useEffect, useRef, useState, useActionState as useReactActionState } from 'react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from '@/context/auth-context';


const initialState = {
  message: '',
  apiKey: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Add API Key
    </Button>
  );
}

export function AddApiKeyForm({ onApiKeyAdded }: { onApiKeyAdded: () => void }) {
  const { user } = useAuth();
  const boundAddApiKeyAction = user ? addApiKeyAction.bind(null, user.id) : null;
  
  const [state, formAction] = useReactActionState(
    boundAddApiKeyAction || ((p:any, f:any) => Promise.resolve({message: 'User not authenticated', errors: {form:['User not authenticated.']}, apiKey: null})),
    initialState
  );

  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();


  useEffect(() => {
    if (state.message && !state.errors && state.apiKey) { // Check for apiKey in state
      toast({ title: "Success", description: state.message, variant: "default" });
      onApiKeyAdded(); 
      formRef.current?.reset(); 
      setExpiresAt(undefined);
    } else if (state.message && state.errors) {
      const errorMessages = Object.values(state.errors).flat().join(', ');
      toast({ title: "Error", description: state.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (state.message && !state.apiKey && !state.errors) { // Handle generic error messages from action
       toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onApiKeyAdded]);

  if (!user || !boundAddApiKeyAction) {
    return (
      <Card className="w-full shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User not authenticated. Cannot add API key.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-foreground">Add New API Key</CardTitle>
        <CardDescription className="text-muted-foreground">
          Securely store your API key details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="keyName" className="text-foreground">Key Name*</Label>
            <Input id="keyName" name="keyName" placeholder="e.g., Stripe Production Key" required className="bg-input border-input-border" />
            {state.errors?.keyName && <p className="text-sm text-destructive mt-1">{state.errors.keyName[0]}</p>}
          </div>

          <div>
            <Label htmlFor="keyValue" className="text-foreground">Key Value*</Label>
            <Input id="keyValue" name="keyValue" type="password" placeholder="Enter the API key value" required className="bg-input border-input-border font-code" />
             {state.errors?.keyValue && <p className="text-sm text-destructive mt-1">{state.errors.keyValue[0]}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tag" className="text-foreground">Tag (Optional)</Label>
              <Input id="tag" name="tag" placeholder="e.g., Payment, AI, Storage" className="bg-input border-input-border"/>
            </div>
            <div>
              <Label htmlFor="expiresAt" className="text-foreground">Expires At (Optional)</Label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-input border-input-border",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {expiresAt && <input type="hidden" name="expiresAt" value={expiresAt.toISOString()} />}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Any specific instructions or context for this key..." className="min-h-[80px] bg-input border-input-border"/>
          </div>
          
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

