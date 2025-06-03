
'use client';

import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Settings, FileText, Download, FolderKanban, KeyRound, BookOpen, Loader2, ListChecks, ExternalLink, Activity, Trophy, Crown, Award } from 'lucide-react';
import Link from 'next/link';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, UserPerformanceScore, User as AuthUserType } from '@/types'; // Added AuthUserType
import { getProjectsAction } from '@/app/actions/projects';
import { getApiKeysAction } from '@/app/actions/repository'; // Added to get API key count
import { getReferences } from '@/app/actions/references'; // Added to get reference count
import { calculateMonthlyLeaderboard } from '@/app/actions/performance';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
// import { MOCK_USERS_ARRAY } from '@/lib/mock-data'; // Using MOCK_USERS_ARRAY_FOR_SELECT from context
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const mockWeeklyTrendData = [
  { week: 'Week 1', projects: 5, apiKeys: 10, references: 15, aiUsage: 20 },
  { week: 'Week 2', projects: 7, apiKeys: 12, references: 18, aiUsage: 25 },
  { week: 'Week 3', projects: 6, apiKeys: 15, references: 20, aiUsage: 22 },
  { week: 'Week 4', projects: 9, apiKeys: 13, references: 22, aiUsage: 30 },
];

const chartConfig = {
  projects: { label: 'Projects', color: 'hsl(var(--chart-1))' },
  apiKeys: { label: 'API Keys', color: 'hsl(var(--chart-2))' },
  references: { label: 'References', color: 'hsl(var(--chart-3))' },
  aiUsage: { label: 'AI Usage', color: 'hsl(var(--chart-4))' },
};


export default function AdminOverviewPage() {
  const { user, loading, MOCK_USERS_ARRAY_FOR_SELECT } = useAuth(); // Use MOCK_USERS_ARRAY_FOR_SELECT from context
  const router = useRouter();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [topPerformers, setTopPerformers] = useState<UserPerformanceScore[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [totalApiKeysCount, setTotalApiKeysCount] = useState(0);
  const [totalReferencesCount, setTotalReferencesCount] = useState(0);


  const fetchAdminData = useCallback(async () => {
    if (user?.isAdmin) {
      setIsLoadingProjects(true);
      setIsLoadingLeaderboard(true);
      try {
        const projects = await getProjectsAction('admin-1'); // Admin ID
        setAllProjects(projects);

        const leaderboard = await calculateMonthlyLeaderboard();
        setTopPerformers(leaderboard.slice(0, 3)); 

        const apiKeys = await getApiKeysAction('admin-1');
        setTotalApiKeysCount(apiKeys.length);

        const references = await getReferences('admin-1');
        setTotalReferencesCount(references.length);

      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        setAllProjects([]);
        setTopPerformers([]);
        setTotalApiKeysCount(0);
        setTotalReferencesCount(0);
      }
      setIsLoadingProjects(false);
      setIsLoadingLeaderboard(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.replace('/dashboard');
    }
    fetchAdminData();
  }, [user, loading, router, fetchAdminData]);

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "Draft": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
      case "In Progress": return "bg-blue-500/20 text-blue-700 border-blue-500/50";
      case "Completed": return "bg-green-500/20 text-green-700 border-green-500/50";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };


  if (loading || !user || !user.isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalUsers = MOCK_USERS_ARRAY_FOR_SELECT.filter(u => !u.isAdmin).length;
  const activeProjects = allProjects.filter(p => p.status === "In Progress").length;
  const recentProjects = allProjects.slice(0, 5);


  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-headline text-foreground">
        {user.name ? `Welcome, ${user.name}!` : "Admin Dashboard"}
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Users", value: totalUsers, icon: Users, color: "text-blue-500" },
          { title: "Active Projects", value: activeProjects, icon: FolderKanban, color: "text-green-500" },
          { title: "API Keys Stored", value: totalApiKeysCount, icon: KeyRound, color: "text-yellow-500" },
          { title: "References Saved", value: totalReferencesCount, icon: BookOpen, color: "text-purple-500" },
        ].map(item => (
          <Card key={item.title} className="shadow-lg bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="shadow-lg bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">Weekly Activity Trends</CardTitle>
            <CardDescription className="text-muted-foreground">Overview of key metrics over the last 4 weeks.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={mockWeeklyTrendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} cursorStyle={{ fill: "hsla(var(--background), 0.5)" }}/>
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="projects" fill="var(--color-projects)" radius={4} />
                  <Bar dataKey="apiKeys" fill="var(--color-apiKeys)" radius={4} />
                  <Bar dataKey="references" fill="var(--color-references)" radius={4} />
                  <Bar dataKey="aiUsage" fill="var(--color-aiUsage)" radius={4} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary"/>Top Performers</CardTitle>
            <CardDescription className="text-muted-foreground">Current monthly performance leaders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingLeaderboard ? (
                 <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ): topPerformers.length > 0 ? (
              topPerformers.map((perfUser, index) => (
                <div key={perfUser.userId} className={`flex items-center justify-between p-2.5 rounded-md border ${perfUser.rank === 1 ? 'bg-primary/10 border-primary' : 'border-border'}`}>
                  <div className="flex items-center gap-2.5">
                    {perfUser.rank === 1 && <Crown className="h-5 w-5 text-yellow-500" />}
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={perfUser.avatarUrl} alt={perfUser.userName} />
                      <AvatarFallback>{getInitials(perfUser.userName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`font-medium ${perfUser.rank === 1 ? 'text-primary' : 'text-foreground'}`}>{perfUser.userName}</p>
                      <p className="text-xs text-muted-foreground">Rank: {perfUser.rank}</p>
                    </div>
                  </div>
                  <Badge variant={perfUser.rank === 1 ? 'default' : 'secondary'} className="text-sm">Avg: {perfUser.score.toFixed(2)}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No performance data available.</p>
            )}
             <Button variant="link" className="w-full text-primary text-xs" asChild>
                <Link href="/admin/performance">Manage Team Scores</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Recent Projects</CardTitle>
            <CardDescription className="text-muted-foreground">A quick look at the latest projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {isLoadingProjects ? (
              <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : recentProjects.length > 0 ? (
              recentProjects.map(project => (
                <div key={project.id} className="p-3 border border-border rounded-md hover:bg-accent/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-foreground">{project.name}</h4>
                    <Badge variant="outline" className={getStatusColor(project.status)}>{project.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By: {MOCK_USERS_ARRAY_FOR_SELECT.find(u => u.id === project.userId)?.name || project.userId} • Type: {project.type} • Created {formatDistanceToNow(parseISO(project.createdAt), { addSuffix: true })}
                  </p>
                  {project.description && <p className="text-sm text-foreground/80 mt-1 truncate">{project.description}</p>}
                  {project.link && <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center mt-1"><ExternalLink className="h-3 w-3 mr-1"/>View Link</a>}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No projects found.</p>
            )}
            {allProjects.length > 5 && (
               <Button variant="link" className="w-full text-primary" asChild>
                  <Link href="/admin/projects">View All Projects ({allProjects.length})</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground flex items-center">
              <Activity className="mr-2 h-5 w-5 text-primary"/>Recent Team Activity
            </CardTitle>
            <CardDescription className="text-muted-foreground">A glimpse of recent actions by users (mock data).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {[
              { id: 1, user: 'Alice Wonderland', action: 'added a new project', item: 'E-commerce Platform', time: '2 hours ago' },
              { id: 2, user: 'Charlie Demo', action: 'saved an API Key', item: 'Stripe Test', time: '5 hours ago' },
              { id: 3, user: 'Alice Wonderland', action: 'added a new reference', item: 'Advanced CSS Techniques', time: '1 day ago' },
              { id: 4, user: 'Charlie Demo', action: 'updated project status', item: 'Mobile App UI Design to Testing', time: '2 days ago' },
              { id: 5, user: 'System Admin', action: 'assigned a new task', item: 'Review Q4 Budget to Alice', time: '3 days ago' },
            ].map(activity => (
              <div key={activity.id} className="p-2.5 border border-border rounded-md hover:bg-accent/50 transition-colors text-sm">
                <span className="font-semibold text-foreground">{activity.user}</span>
                <span className="text-foreground/80"> {activity.action}: </span>
                <span className="italic text-primary">{activity.item}</span>
                <span className="text-xs text-muted-foreground float-right pt-1">{activity.time}</span>
              </div>
            ))}
             <p className="text-xs text-muted-foreground text-center pt-2">Full audit log feature coming soon.</p>
          </CardContent>
        </Card>
      </div>


      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users" passHref><Button variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4" /> Manage Users & PINs</Button></Link>
            <Button variant="outline" className="w-full justify-start" disabled><FileText className="mr-2 h-4 w-4" /> View All Content (Soon)</Button>
            <Button variant="outline" className="w-full justify-start" disabled><Download className="mr-2 h-4 w-4" /> Export Reports (Soon)</Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-foreground">System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled><Settings className="mr-2 h-4 w-4" /> Configure AI Models (Soon)</Button>
            <Link href="/admin/analytics" passHref>
              <Button variant="outline" className="w-full justify-start"><BarChart3 className="mr-2 h-4 w-4" /> AI Usage Analytics</Button>
            </Link>
             <Link href="/admin/performance" passHref>
              <Button variant="outline" className="w-full justify-start"><Award className="mr-2 h-4 w-4" /> Team Performance</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
