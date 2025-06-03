
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, KeyRound, FolderKanban, Lightbulb, Users, BarChart3, ListChecks, CheckCircle2, MessageSquareQuote, Check, MessageSquare, Trophy, ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState, useCallback } from "react";
import type { Task, AdminAnnouncement, DirectMessage, UserPerformanceScore } from "@/types";
import { getTasksForUserAction } from "@/app/actions/tasks";
import { getAnnouncementsForUserAction, markAnnouncementReadAction } from "@/app/actions/announcements";
import { getDirectMessagesForUserAction, getUnreadMessagesCountAction as getUnreadDMs, markMessagesAsReadAction as markDmsAsRead } from "@/app/actions/directMessages"; // Updated import for unread count
import { calculateMonthlyLeaderboard } from '@/app/actions/performance';
import { generateDailyWisdom } from '@/ai/flows/generate-daily-wisdom';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserMessagesDialog } from "@/components/chat/user-messages-dialog";
// import { MOCK_USERS_ARRAY } from "@/lib/mock-data"; // Using MOCK_USERS_ARRAY_FOR_SELECT from AuthContext
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  const { user, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); // Use from AuthContext
  const { toast } = useToast();
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [userAnnouncements, setUserAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [userDirectMessages, setUserDirectMessages] = useState<DirectMessage[]>([]); // Stores unread for summary
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingDms, setIsLoadingDms] = useState(true);
  const [isUserMessagesDialogOpen, setIsUserMessagesDialogOpen] = useState(false);

  const [leaderboardData, setLeaderboardData] = useState<UserPerformanceScore[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  const [dailyWisdom, setDailyWisdom] = useState<string | null>(null);
  const [isLoadingWisdom, setIsLoadingWisdom] = useState(true);

  useEffect(() => {
    async function fetchWisdom() {
      if (user) {
        setIsLoadingWisdom(true);
        try {
          const result = await generateDailyWisdom();
          setDailyWisdom(result.wisdom);
        } catch (error) {
          console.error("Failed to fetch daily wisdom:", error);
          setDailyWisdom("The greatest wisdom is to be content with today."); 
        }
        setIsLoadingWisdom(false);
      }
    }
    fetchWisdom();
  }, [user]);

  const fetchDashboardData = useCallback(async () => {
    if (user && !user.isAdmin) {
      setIsLoadingTasks(true);
      setIsLoadingAnnouncements(true);
      setIsLoadingDms(true);
      setIsLoadingLeaderboard(true);
      try {
        const tasks = await getTasksForUserAction(user.id);
        setUserTasks(tasks);
        const announcements = await getAnnouncementsForUserAction(user.id);
        setUserAnnouncements(announcements);
        
        // Fetch all DMs for user to determine unread for summary, limit to 3 for display
        const allDms = await getDirectMessagesForUserAction(user.id, 'admin-1');
        setUserDirectMessages(allDms.filter(dm => !dm.read && dm.recipientId === user.id).slice(0, 3));

        const leaderboard = await calculateMonthlyLeaderboard();
        setLeaderboardData(leaderboard);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      }
      setIsLoadingTasks(false);
      setIsLoadingAnnouncements(false);
      setIsLoadingDms(false);
      setIsLoadingLeaderboard(false);
    } else {
      setIsLoadingTasks(false);
      setIsLoadingAnnouncements(false);
      setIsLoadingDms(false);
      setIsLoadingLeaderboard(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleMarkAnnouncementRead = async (announcementId: string) => {
    if (!user) return;
    const result = await markAnnouncementReadAction(user.id, announcementId);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      setUserAnnouncements(prev =>
        prev.map(anno =>
          anno.id === announcementId
          ? { ...anno, readBy: { ...(anno.readBy || {}), [user.id]: true } }
          : anno
        )
      );
    } else {
      toast({ title: "Error", description: result.message || "Failed to mark as read.", variant: "destructive" });
    }
  };

  const handleMessagesDialogOpenedOrClosed = () => {
    // This function is called when the dialog opens or closes.
    // Re-fetch DMs and unread count for header when dialog interaction occurs.
    if (user && !user.isAdmin) {
        getUnreadDMs(user.id).then(count => {
            // This count could be passed to Header via a more complex state management if needed,
            // or Header continues to poll. For now, this just re-fetches for dialog.
        });
        fetchDashboardData(); // Re-fetch general dashboard data which includes DM summary.
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const modules = [
    { name: "Reference Library", href: "/dashboard/reference-library", icon: BookOpen, description: "Save and organize articles, videos, and other resources." },
    { name: "API Repository", href: "/dashboard/repository", icon: KeyRound, description: "Securely store and manage your API keys." },
    { name: "My Tasks", href: "/dashboard/tasks", icon: ListChecks, description: "View and manage your assigned tasks." },
  ];

  const adminModules = [
     { name: "Admin Overview", href: "/admin", icon: Users, description: "Manage users and view system overview." },
     { name: "Task Management", href: "/admin/tasks", icon: ListChecks, description: "Assign and track team tasks."},
     { name: "Analytics", href: "/admin/analytics", icon: BarChart3, description: "View application usage and trends." },
  ];

  const displayedModules = user?.isAdmin ? [...modules, ...adminModules] : modules;
  const activeTasks = userTasks.filter(task => task.status !== "Completed");
  const unreadAnnouncements = userAnnouncements.filter(anno => !anno.readBy || !anno.readBy[user?.id || '']);


  return (
    <div className="space-y-8">
      <motion.div initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.5 }}>
        <Card className="bg-card shadow-lg border-border">
          <CardHeader>
            <div className="flex items-start space-x-3">
              <Lightbulb className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <CardTitle className="text-2xl font-headline text-foreground">
                  Welcome to WhiteSpace{user?.name ? `, ${user.name}` : ''}!
                </CardTitle>
                <CardDescription className="text-muted-foreground pt-1">
                  Your central hub for team collaboration and AI-powered productivity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingWisdom ? (
              <div className="flex items-center justify-center h-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : dailyWisdom ? (
              <blockquote className="mt-1 border-l-2 border-primary pl-3 italic text-foreground/90 text-base md:text-md">
                {dailyWisdom}
              </blockquote>
            ) : (
              <p className="text-muted-foreground">Navigate through your modules using the sidebar or the quick links below.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {!user?.isAdmin && (
        <motion.div initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="bg-card shadow-lg border-border h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <ListChecks className="h-7 w-7 text-primary" />
                <CardTitle className="text-xl font-headline text-foreground">My Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {isLoadingTasks ? (
                 <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
              ) : activeTasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-foreground">You have <span className="font-bold text-primary">{activeTasks.length}</span> active task(s).</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {activeTasks.slice(0,3).map(task => (
                       <li key={task.id}>
                         <span className="font-medium text-foreground">{task.title}</span>
                         {task.projectName && <span className="text-xs italic text-primary/80"> ({task.projectName})</span>}
                         {task.dueDate && isValid(parseISO(task.dueDate)) ? ` - Due ${formatDistanceToNow(parseISO(task.dueDate), { addSuffix: true })}` : ' - No due date'}
                         <Badge variant="outline" className="ml-2 text-xs">{task.status}</Badge>
                       </li>
                    ))}
                  </ul>
                  {activeTasks.length > 3 && <Link href="/dashboard/tasks" passHref><Button variant="link" size="sm" className="text-xs text-primary p-0 h-auto mt-1">View all tasks</Button></Link>}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-muted-foreground">No active tasks assigned to you. Great job!</p>
                </div>
              )}
            </CardContent>
             {activeTasks.length === 0 && !isLoadingTasks && (
                <CardFooter>
                    <p className="text-xs text-muted-foreground">Previously completed: {userTasks.filter(t => t.status === 'Completed').length} task(s).</p>
                </CardFooter>
            )}
          </Card>
        </motion.div>
      )}

      {!user?.isAdmin && (
         <motion.div initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.5, delay: 0.15 }}>
          <Card className="bg-card shadow-lg border-border h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <MessageSquareQuote className="h-7 w-7 text-primary" />
                <CardTitle className="text-xl font-headline text-foreground">Admin Announcements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow max-h-72 overflow-y-auto">
              {isLoadingAnnouncements ? (
                 <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
              ) : unreadAnnouncements.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-foreground">You have <span className="font-bold text-primary">{unreadAnnouncements.length}</span> unread announcement(s).</p>
                  {unreadAnnouncements.map(anno => (
                    <div key={anno.id} className="p-2.5 border border-border rounded-md bg-secondary/30">
                      <p className="text-xs text-muted-foreground">From: {anno.sentByAdminName} • {formatDistanceToNow(parseISO(anno.createdAt), { addSuffix: true })}</p>
                      <p className="text-sm text-foreground mt-1">{anno.message}</p>
                      <Button
                        size="sm"
                        variant="link"
                        className="text-xs text-primary p-0 h-auto mt-1.5"
                        onClick={() => handleMarkAnnouncementRead(anno.id)}
                      >
                        <Check className="h-3 w-3 mr-1"/>Mark as Read
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                 <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-muted-foreground">No new announcements.</p>
                </div>
              )}
            </CardContent>
            {userAnnouncements.length > 0 && unreadAnnouncements.length === 0 && !isLoadingAnnouncements && (
                <CardFooter>
                    <p className="text-xs text-muted-foreground">All announcements read. Total received: {userAnnouncements.length}.</p>
                </CardFooter>
            )}
          </Card>
        </motion.div>
      )}

       {!user?.isAdmin && (
        <motion.div initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="bg-card shadow-lg border-border h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <MessageSquare className="h-7 w-7 text-primary" />
                    <CardTitle className="text-xl font-headline text-foreground">Direct Messages</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setIsUserMessagesDialogOpen(true); handleMessagesDialogOpenedOrClosed();}}>View All</Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow max-h-72 overflow-y-auto">
              {isLoadingDms ? (
                <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
              ) : userDirectMessages.length > 0 ? ( // userDirectMessages now holds unread for summary
                <div className="space-y-3">
                  <p className="text-foreground">You have <span className="font-bold text-primary">{userDirectMessages.length}</span> new message(s) from Admin.</p>
                  {userDirectMessages.map(dm => (
                    <div key={dm.id} className="p-2.5 border border-border rounded-md bg-secondary/30 cursor-pointer hover:bg-secondary/50" onClick={() => { setIsUserMessagesDialogOpen(true); handleMessagesDialogOpenedOrClosed();}}>
                      <p className="text-xs text-muted-foreground">From: Admin • {formatDistanceToNow(parseISO(dm.timestamp), { addSuffix: true })}</p>
                      <p className="text-sm text-foreground mt-1 truncate">{dm.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                 <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-muted-foreground">No new direct messages.</p>
                </div>
              )}
            </CardContent>
             {userDirectMessages.length === 0 && !isLoadingDms && ( // Check if no unread messages
                <CardFooter>
                    <p className="text-xs text-muted-foreground">All direct messages read.</p>
                </CardFooter>
            )}
          </Card>
        </motion.div>
      )}
      {user && !user.isAdmin && <UserMessagesDialog isOpen={isUserMessagesDialogOpen} onOpenChange={(isOpen) => { setIsUserMessagesDialogOpen(isOpen); if(!isOpen) handleMessagesDialogOpenedOrClosed(); }} onMessagesRead={handleMessagesDialogOpenedOrClosed} />}
    </div>

    {!user?.isAdmin && (
      <motion.div initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.5, delay: 0.25 }}>
        <Card className="bg-card shadow-lg border-border">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Trophy className="h-7 w-7 text-primary" />
              <CardTitle className="text-xl font-headline text-foreground">Monthly Team Performance</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">Leaderboard based on monthly average scores.</CardDescription>
          </CardHeader>
          <CardContent>
          {isLoadingLeaderboard ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : leaderboardData.length > 0 ? (
            <div className="space-y-3">
              {leaderboardData.slice(0, 5).map((perfUser) => (
                <div
                  key={perfUser.userId}
                  className={`flex items-center justify-between p-3 rounded-md border ${perfUser.rank === 1 ? 'bg-primary/10 border-primary' : 'border-border'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg w-6 text-center ${perfUser.rank === 1 ? 'text-primary' : 'text-muted-foreground'}`}>{perfUser.rank}.</span>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={perfUser.avatarUrl} alt={perfUser.userName} />
                      <AvatarFallback>{getInitials(perfUser.userName)}</AvatarFallback>
                    </Avatar>
                    <span className={`font-medium ${perfUser.rank === 1 ? 'text-primary' : 'text-foreground'}`}>{perfUser.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={perfUser.rank === 1 ? "default" : "secondary"} className="text-sm">
                      Avg: {perfUser.score.toFixed(2)}
                    </Badge>
                    {perfUser.rank === 1 && <ArrowUp className="h-4 w-4 text-green-500" />}
                    {perfUser.rank && perfUser.rank > 1 && perfUser.rank <=3 && <Minus className="h-4 w-4 text-yellow-500" />}
                    {perfUser.rank && perfUser.rank > 3 && <ArrowDown className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No performance data available for this month yet.</p>
          )}
            {leaderboardData.length > 5 && (
                <p className="text-xs text-muted-foreground text-center mt-3">Showing top 5 performers.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )}


      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {displayedModules.map((mod, index) => (
          <motion.div
            key={mod.name}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            transition={{ duration: 0.5, delay: 0.1 * (index + (user?.isAdmin ? 2 : (isLoadingDms ? 5 : 4))) }}
          >
            <Card className="h-full flex flex-col hover:shadow-xl transition-shadow duration-300 bg-card border-border">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                  <mod.icon className="h-7 w-7 text-primary" />
                  <CardTitle className="text-xl font-headline text-foreground">{mod.name}</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm flex-grow">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Link href={mod.href} passHref>
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    Go to {mod.name}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
