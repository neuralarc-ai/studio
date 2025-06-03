
'use client';

import { useState, useRef, useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { sendDirectMessageAction } from '@/app/actions/directMessages';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Use MOCK_USERS_ARRAY_FOR_SELECT from AuthContext
import { useFormStatus } from 'react-dom';

const sendDmInitialState = {
  message: '',
  sentMessage: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Send Message
    </Button>
  );
}

interface AdminDirectMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AdminDirectMessageDialog({ isOpen, onOpenChange }: AdminDirectMessageDialogProps) {
  const { user, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); // Admin user and list of users for select
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [recipientUserId, setRecipientUserId] = useState<string>('');

  const boundSendDmAction = user ? sendDirectMessageAction.bind(null, user.id) : null;
  const [sendDmState, sendDmFormAction, isSending] = useActionState(
    boundSendDmAction || ((p: any, f: any) => Promise.resolve({ message: 'Admin not authenticated', errors: null, sentMessage: null })),
    sendDmInitialState
  );
  
  useEffect(() => {
    if (sendDmState.message && !sendDmState.errors && sendDmState.sentMessage) {
      toast({ title: "Success", description: sendDmState.message });
      formRef.current?.reset();
      setRecipientUserId('');
      onOpenChange(false); 
    } else if (sendDmState.message && sendDmState.errors) {
      const errorMessages = Object.values(sendDmState.errors || {}).flat().join(', ');
      toast({ title: "Error", description: sendDmState.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (sendDmState.message && !sendDmState.sentMessage && !sendDmState.errors) {
      toast({ title: "Error", description: sendDmState.message, variant: "destructive" });
    }
  }, [sendDmState, toast, onOpenChange]);

  const memberUsers = MOCK_USERS_ARRAY_FOR_SELECT.filter(u => !u.isAdmin);

  if (!user || !user.isAdmin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-foreground">Send Direct Message</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Compose and send a message to a specific team member.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={sendDmFormAction} className="space-y-4 py-4">
          <div>
            <Label htmlFor="recipientUserId" className="text-foreground">To User*</Label>
            <Select name="recipientUserId" required value={recipientUserId} onValueChange={setRecipientUserId}>
              <SelectTrigger className="w-full bg-input border-input-border">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border">
                {memberUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.pinFirstTwo}**)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sendDmState.errors?.recipientUserId && <p className="text-sm text-destructive mt-1">{sendDmState.errors.recipientUserId[0]}</p>}
          </div>
          <div>
            <Label htmlFor="message" className="text-foreground">Message*</Label>
            <Textarea id="message" name="message" placeholder="Type your message here..." required className="min-h-[120px] bg-input border-input-border"/>
            {sendDmState.errors?.message && <p className="text-sm text-destructive mt-1">{sendDmState.errors.message[0]}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>Cancel</Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
