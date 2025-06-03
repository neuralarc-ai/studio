
'use client';

import { useState, useEffect, useRef, useActionState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
// import { Label } from '@/components/ui/label'; // Not used in this form
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Removed DialogFooter
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getDirectMessagesForUserAction, replyToAdminAction, markMessagesAsReadAction } from '@/app/actions/directMessages';
import type { DirectMessage } from '@/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useFormStatus } from 'react-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Using MOCK_USERS_ARRAY_FOR_SELECT from context

const replyInitialState = {
  message: '',
  sentMessage: null,
  errors: null,
};

function ReplySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Reply
    </Button>
  );
}

interface UserMessagesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMessagesRead: () => void; 
}

export function UserMessagesDialog({ isOpen, onOpenChange, onMessagesRead }: UserMessagesDialogProps) {
  const { user, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); // Use MOCK_USERS_ARRAY_FOR_SELECT from context
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const adminUser = MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === 'admin-1');

  const fetchMessages = useCallback(async () => {
    if (!user || user.isAdmin) return;
    setIsLoadingMessages(true);
    try {
      const dms = await getDirectMessagesForUserAction(user.id, 'admin-1'); 
      setMessages(dms);
      if (dms.some(dm => dm.recipientId === user.id && !dm.read)) {
        await markMessagesAsReadAction(user.id, 'admin-1');
        onMessagesRead(); 
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load messages.", variant: "destructive" });
    }
    setIsLoadingMessages(false);
  }, [user, toast, onMessagesRead]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const boundReplyAction = user ? async (prevState: any, formData: FormData) => {
    const message = formData.get('replyMessage') as string;
    if (!message || !user) return { message: 'Error', errors: {replyMessage: ['Invalid data']}, sentMessage: null};
    return replyToAdminAction(user.id, message);
  } : null;

  const [replyState, replyFormAction, isReplying] = useActionState(
     boundReplyAction || ((p:any, f:any) => Promise.resolve({ message: 'User not authenticated', errors: null, sentMessage: null })),
    replyInitialState
  );

  useEffect(() => {
    if (replyState.message && !replyState.errors && replyState.sentMessage) {
      toast({ title: "Success", description: replyState.message });
      formRef.current?.reset();
      setMessages(prev => [...prev, replyState.sentMessage as DirectMessage]); 
    } else if (replyState.message && replyState.errors) {
      const errorMessages = Object.values(replyState.errors || {}).flat().join(', ');
      toast({ title: "Error", description: replyState.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    }
  }, [replyState, toast]);

  if (!user || user.isAdmin) return null;

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-card border-border h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-foreground flex items-center">
            <MessageSquare className="mr-2 h-6 w-6 text-primary" />
            Messages from Admin
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View and reply to messages from the site administrator.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4 -mr-4 my-2">
          <div className="space-y-4 p-1">
            {isLoadingMessages && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
            {!isLoadingMessages && messages.length === 0 && (
              <p className="text-muted-foreground text-center py-6">No messages yet.</p>
            )}
            {messages.map(dm => (
              <div key={dm.id} className={`flex ${dm.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-2 max-w-[75%]`}>
                  {dm.senderId !== user.id && adminUser && (
                    <Avatar className="h-6 w-6 self-start">
                      <AvatarImage src={adminUser.avatarUrl} alt={adminUser.name} />
                      <AvatarFallback className="text-xs">{getInitials(adminUser.name)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`p-3 rounded-lg shadow-sm ${dm.senderId === user.id ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'}`}>
                    <p className="text-sm whitespace-pre-line">{dm.message}</p>
                    <p className={`text-xs mt-1 ${dm.senderId === user.id ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(parseISO(dm.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                   {dm.senderId === user.id && user && (
                     <Avatar className="h-6 w-6 self-start">
                       <AvatarImage src={user.avatarUrl} alt={user.name} />
                       <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                     </Avatar>
                   )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <form ref={formRef} action={replyFormAction} className="mt-auto pt-4 border-t border-border">
          <div className="flex items-start space-x-2">
            <Textarea 
              id="replyMessage" 
              name="replyMessage" 
              placeholder="Type your reply..." 
              required 
              className="flex-grow bg-input border-input-border min-h-[40px] max-h-[100px] resize-none text-sm" 
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).closest('form')?.requestSubmit();
                }
              }}
            />
            <ReplySubmitButton />
          </div>
           {replyState.errors?.replyMessage && <p className="text-sm text-destructive mt-1">{replyState.errors.replyMessage[0]}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
