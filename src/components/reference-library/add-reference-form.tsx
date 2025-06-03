
'use client';

import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addReferenceAction, getAutocompleteTitle } from '@/app/actions/references';
import { useEffect, useState, useRef, useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context'; // Import useAuth

const initialState = {
  message: '',
  reference: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Add Reference
    </Button>
  );
}

export function AddReferenceForm({ onReferenceAdded }: { onReferenceAdded: () => void }) {
  const { user } = useAuth(); // Get current user
  const boundAddReferenceAction = user ? addReferenceAction.bind(null, user.id) : null;

  const [state, formAction] = useActionState(
    boundAddReferenceAction || ((p: any, f: any) => Promise.resolve({ message: 'User not authenticated', errors: { form: ['User not authenticated.'] }, reference: null })),
    initialState
  );

  const { toast } = useToast();
  const [linkValue, setLinkValue] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message && !state.errors && state.reference) { // Check for reference in state
      toast({ title: "Success", description: state.message, variant: "default" });
      onReferenceAdded(); 
      formRef.current?.reset(); 
      setLinkValue('');
      setTitleValue('');
    } else if (state.message && state.errors) {
      const errorMessages = Object.values(state.errors || {}).flat().join(', ');
      toast({ title: "Error", description: state.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (state.message && !state.reference && !state.errors) {
       toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onReferenceAdded]);

  const handleLinkBlur = async () => {
    if (linkValue && !titleValue) { 
      setIsFetchingTitle(true);
      const result = await getAutocompleteTitle(linkValue);
      if (result.title) {
        setTitleValue(result.title);
      } else if (result.error) {
        console.warn("Title autocomplete:", result.error);
      }
      setIsFetchingTitle(false);
    }
  };

  if (!user || !boundAddReferenceAction) {
    return (
      <Card className="w-full shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User not authenticated. Cannot add reference.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-foreground">Add New Reference</CardTitle>
        <CardDescription className="text-muted-foreground">
          Paste a link to an article or video. Title can be auto-suggested.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="link" className="text-foreground">Link URL*</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="link"
                name="link"
                type="url"
                placeholder="https://example.com"
                required
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onBlur={handleLinkBlur}
                className="bg-input border-input-border"
              />
              {isFetchingTitle && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>
            {state.errors?.link && <p className="text-sm text-destructive mt-1">{state.errors.link[0]}</p>}
          </div>

          <div>
            <Label htmlFor="title" className="text-foreground">Title (Optional - AI can suggest)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="title"
                name="title"
                placeholder="Reference Title"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="bg-input border-input-border"
              />
              <Button type="button" variant="ghost" size="icon" onClick={handleLinkBlur} disabled={!linkValue || isFetchingTitle} title="Suggest Title with AI">
                <Sparkles className="h-5 w-5 text-primary" />
              </Button>
            </div>
             {state.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title[0]}</p>}
          </div>

          <div>
            <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Your notes about this reference..."
              className="min-h-[80px] bg-input border-input-border"
            />
          </div>

          <div>
            <Label htmlFor="tags" className="text-foreground">Tags (Optional, comma-separated)</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="e.g., AI, productivity, webdev"
              className="bg-input border-input-border"
            />
          </div>
          
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
