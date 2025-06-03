
'use client';

import { useState, useEffect, useCallback, useActionState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, RefreshCw, Send, Trash2, Users, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import type { AdminAnnouncement, User as AuthUserType } from '@/types';
import { sendAdminAnnouncementAction, getAllAnnouncementsAction, deleteAnnouncementAction } from '@/app/actions/announcements';
// Removed MOCK_USERS_ARRAY import, use useAuth().MOCK_USERS_ARRAY_FOR_SELECT
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useFormStatus } from 'react-dom';
import { Badge } from '@/components/ui/badge';

const sendAnnouncementInitialState = {
  message: '',
  announcement: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Send Announcement
    </Button>
  );
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // const [showSendForm, setShowSendForm] = useState(true); // Default to show, form always visible now
  const { user, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); // Admin user and list of users
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [recipientUserId, setRecipientUserId] = useState<string>('all');

  const boundSendAction = user ? sendAdminAnnouncementAction.bind(null, user.id, user.name) : null;
  const [sendState, sendFormAction] = useActionState(
    boundSendAction || ((p:any, f:any) => Promise.resolve({message: 'Admin not authenticated', errors: null, announcement: null})),
    sendAnnouncementInitialState
  );

  const fetchAnnouncements = useCallback(async () => {
    if (!user || !user.isAdmin) return;
    setIsLoading(true);
    try {
      const allAnnos = await getAllAnnouncementsAction();
      setAnnouncements(allAnnos);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load announcements.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (!user || !user.isAdmin) return;
    fetchAnnouncements();
  }, [fetchAnnouncements, user]);

  useEffect(() => {
    if (sendState.message && !sendState.errors && sendState.announcement) {
      toast({ title: "Success", description: sendState.message });
      fetchAnnouncements(); 
      formRef.current?.reset();
      setRecipientUserId('all'); 
    } else if (sendState.message && sendState.errors) {
      const errorMessages = Object.values(sendState.errors || {}).flat().join(', ');
      toast({ title: "Error", description: sendState.message + (errorMessages ? `: ${errorMessages}` : ''), variant: "destructive" });
    } else if (sendState.message && !sendState.announcement && !sendState.errors) {
      toast({ title: "Error", description: sendState.message, variant: "destructive" });
    }
  }, [sendState, toast, fetchAnnouncements]);

  const handleDeleteAnnouncement = async (id: string) => {
    if (!user || !user.isAdmin) return;
    const originalAnnouncements = [...announcements];
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    const result = await deleteAnnouncementAction(id, user.id);
    if (!result.success) {
      setAnnouncements(originalAnnouncements);
      toast({ title: "Error", description: result.message || "Failed to delete.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: result.message });
    }
  };

  const memberUsers = MOCK_USERS_ARRAY_FOR_SELECT.filter(u => !u.isAdmin);

  if (!user || !user.isAdmin) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Verifying admin access...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <Send className="mr-3 h-8 w-8 text-primary" /> Send Announcements
        </h1>
        <div className="flex gap-2">
           <Button onClick={fetchAnnouncements} variant="ghost" size="icon" title="Refresh Announcements" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground">Broadcast messages to all users or send targeted announcements to specific team members.</p>

      <Card className="w-full shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-foreground">Compose New Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={sendFormAction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="recipientUserId" className="text-foreground">Recipient*</Label>
                <Select name="recipientUserId" required value={recipientUserId} onValueChange={setRecipientUserId}>
                  <SelectTrigger className="w-full bg-input border-input-border">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border">
                    <SelectItem value="all"><Users className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>All Users</SelectItem>
                    {memberUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}><UserIcon className="inline-block mr-2 h-4 w-4 text-muted-foreground"/>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sendState.errors?.recipientUserId && <p className="text-sm text-destructive mt-1">{sendState.errors.recipientUserId[0]}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="message" className="text-foreground">Message*</Label>
              <Textarea id="message" name="message" placeholder="Type your announcement here..." required className="min-h-[120px] bg-input border-input-border"/>
              {sendState.errors?.message && <p className="text-sm text-destructive mt-1">{sendState.errors.message[0]}</p>}
            </div>
            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-8">
        <h2 className="text-2xl font-headline text-foreground mb-4">Previously Sent Announcements</h2>
        {isLoading && <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
        {!isLoading && announcements.length === 0 && (
          <p className="text-muted-foreground text-center py-6">No announcements have been sent yet.</p>
        )}
        {announcements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {announcements.map(anno => (
                <motion.div
                  key={anno.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <Card className="bg-card border-border shadow-sm h-full flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-md font-semibold text-foreground">
                          To: {anno.recipientUserId === 'all' ? 'All Users' : MOCK_USERS_ARRAY_FOR_SELECT.find(u=>u.id === anno.recipientUserId)?.name || 'Unknown User'}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          Sent {formatDistanceToNow(parseISO(anno.createdAt), { addSuffix: true })}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-muted-foreground">By: {anno.sentByAdminName}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-foreground/90 whitespace-pre-line">{anno.message}</p>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-2 mt-auto">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAnnouncement(anno.id)} title="Delete Announcement">
                        <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
