
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, LineChart, Pie, PieChart, Cell, Area, AreaChart } from 'recharts';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Users, FolderKanban, Activity, TrendingUp, Globe, MousePointerClick, UsersRound, BarChart3 as PageIcon, Link as LinkIcon, AlertTriangle, LayoutDashboard, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const weeklyActivityData = [
  { date: 'Mon', projects: 4, references: 10, apiKeys: 2, tasksCompleted: 1 },
  { date: 'Tue', projects: 3, references: 8, apiKeys: 5, tasksCompleted: 3 },
  { date: 'Wed', projects: 6, references: 12, apiKeys: 3, tasksCompleted: 2 },
  { date: 'Thu', projects: 5, references: 7, apiKeys: 6, tasksCompleted: 5 },
  { date: 'Fri', projects: 8, references: 15, apiKeys: 4, tasksCompleted: 4 },
  { date: 'Sat', projects: 2, references: 5, apiKeys: 1, tasksCompleted: 1 },
  { date: 'Sun', projects: 1, references: 3, apiKeys: 0, tasksCompleted: 0 },
];

const chartConfigWeekly = {
  projects: { label: 'Projects', color: 'hsl(var(--chart-1))' },
  references: { label: 'References', color: 'hsl(var(--chart-2))' },
  apiKeys: { label: 'API Keys', color: 'hsl(var(--chart-3))' },
  tasksCompleted: { label: 'Tasks Done', color: 'hsl(var(--chart-4))'},
};

const aiUsageData = [
  { name: 'Title Autocomplete', value: 400, fill: 'hsl(var(--chart-1))' },
  { name: 'API Suggestions', value: 300, fill: 'hsl(var(--chart-2))' },
  { name: 'Project Recs', value: 200, fill: 'hsl(var(--chart-3))' },
  { name: 'Task Prioritization (Future)', value: 50, fill: 'hsl(var(--chart-4))' },
  { name: 'Other AI Feature', value: 100, fill: 'hsl(var(--chart-5))' },
];

const trafficSourceData = [
  { source: 'Organic Search', visitors: 2200, fill: 'hsl(var(--chart-1))' },
  { source: 'Direct', visitors: 1800, fill: 'hsl(var(--chart-2))' },
  { source: 'Referral', visitors: 1200, fill: 'hsl(var(--chart-3))' },
  { source: 'Social Media', visitors: 800, fill: 'hsl(var(--chart-4))' },
];

const pageViewsData = [
  { page: '/home', views: 4500 },
  { page: '/features', views: 3200 },
  { page: '/pricing', views: 2800 },
  { page: '/blog', views: 2100 },
  { page: '/contact', views: 1500 },
];


export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [externalAnalyticsUrl, setExternalAnalyticsUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLoadExternalAnalytics = () => {
    if (externalAnalyticsUrl.trim()) {
      try {
        new URL(externalAnalyticsUrl);
        setIframeSrc(externalAnalyticsUrl);
      } catch (_) {
        alert("Please enter a valid URL.");
        setIframeSrc('');
      }
    } else {
      setIframeSrc('');
    }
  };

  if (authLoading || !user || !user.isAdmin) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <PageIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline text-foreground">Analytics</h1>
      </div>
      <p className="text-muted-foreground">Unified dashboard providing insights into application usage, mock web traffic, and embedded external analytics.</p>

      <Tabs defaultValue="app-analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="app-analytics">
            <LayoutDashboard className="mr-2 h-4 w-4"/>Application Analytics
          </TabsTrigger>
          <TabsTrigger value="external-analytics">
            <ExternalLink className="mr-2 h-4 w-4"/>External Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="app-analytics" className="space-y-6">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-lg bg-card border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Total Users</CardTitle>
                <UsersRound className="h-5 w-5 text-primary"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">15</p>
                <p className="text-xs text-muted-foreground">+2 this month</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-card border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Total Site Visits</CardTitle>
                <Globe className="h-5 w-5 text-primary"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">12,450</p>
                <p className="text-xs text-muted-foreground">+5.2% last 7 days</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-card border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Bounce Rate</CardTitle>
                <TrendingUp className="h-5 w-5 text-destructive"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">45.6%</p>
                <p className="text-xs text-muted-foreground">-1.5% change (lower is better)</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-card border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Avg. Session</CardTitle>
                <Activity className="h-5 w-5 text-primary"/>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">3m 45s</p>
                <p className="text-xs text-muted-foreground">+12s this month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="shadow-lg bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-foreground">Weekly App Activity</CardTitle>
                <CardDescription className="text-muted-foreground">Items created/added within the app this week.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full">
                <ChartContainer config={chartConfigWeekly} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} cursorStyle={{ stroke: "hsl(var(--accent))", strokeWidth: 1.5 }} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line type="monotone" dataKey="projects" stroke="var(--color-projects)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-projects)" }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="references" stroke="var(--color-references)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-references)" }} activeDot={{ r: 6 }}/>
                      <Line type="monotone" dataKey="apiKeys" stroke="var(--color-apiKeys)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-apiKeys)" }} activeDot={{ r: 6 }}/>
                      <Line type="monotone" dataKey="tasksCompleted" stroke="var(--color-tasksCompleted)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-tasksCompleted)" }} activeDot={{ r: 6 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-foreground">AI Feature Usage</CardTitle>
                <CardDescription className="text-muted-foreground">Popularity of AI-powered features.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full flex items-center justify-center">
                <ChartContainer config={{}} className="h-full w-full aspect-square">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={aiUsageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (percent * 100) > 5 ? (
                                <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                  {`${aiUsageData[index].name} (${(percent * 100).toFixed(0)}%)`}
                                </text>
                              ) : null;
                            }}>
                        {aiUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--border))" />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <ChartLegend content={<ChartLegendContent />} wrapperStyle={{fontSize: '12px'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="shadow-lg bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-foreground">Website Traffic Sources</CardTitle>
                    <CardDescription className="text-muted-foreground">How users are finding your website (mock data).</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                    <ChartContainer config={{ visitors: { label: 'Visitors' } }} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trafficSourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))"/>
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis dataKey="source" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <ChartTooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--accent)/50)'}}/>
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="visitors" radius={[0, 4, 4, 0]} barSize={30}>
                                    {trafficSourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card className="shadow-lg bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-foreground">Top Visited Pages</CardTitle>
                    <CardDescription className="text-muted-foreground">Most popular pages on your website (mock data).</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                    <ChartContainer config={{ views: { label: "Views", color: "hsl(var(--chart-1))" } }} className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={pageViewsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="page" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--accent)/30)'}} />
                                <Area type="monotone" dataKey="views" stroke="var(--color-views)" fill="var(--color-views)" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="external-analytics" className="space-y-6">
          <Card className="shadow-lg bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-headline text-foreground flex items-center">
                <LinkIcon className="mr-2 h-5 w-5 text-primary"/>
                Embed External Analytics Dashboard
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Paste the URL of your external analytics dashboard (e.g., Google Analytics) to view it here.
                The embedded page will be displayed in grayscale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-grow space-y-1">
                  <Label htmlFor="externalAnalyticsUrl" className="text-foreground">Dashboard URL</Label>
                  <Input
                    id="externalAnalyticsUrl"
                    type="url"
                    placeholder="https://analytics.example.com"
                    value={externalAnalyticsUrl}
                    onChange={(e) => setExternalAnalyticsUrl(e.target.value)}
                    className="bg-input border-input-border"
                  />
                </div>
                <Button onClick={handleLoadExternalAnalytics} className="w-full sm:w-auto">
                  Load Dashboard
                </Button>
              </div>
              <div className="p-3 bg-secondary/50 rounded-md border border-border text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0"/>
                <span>
                  <strong>Note:</strong> Many analytics platforms (like Google Analytics) prevent embedding on other websites for security reasons. If the page doesn't load, this might be the cause. We can only apply a grayscale filter; internal fonts and layout are controlled by the external page.
                </span>
              </div>
              {iframeSrc && (
                <div className="border border-border rounded-lg overflow-hidden aspect-video bg-muted/30">
                  <iframe
                    src={iframeSrc}
                    title="External Analytics Dashboard"
                    className="w-full h-full border-0"
                    style={{ filter: 'grayscale(100%)' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              )}
              {!iframeSrc && externalAnalyticsUrl && (
                <p className="text-sm text-muted-foreground text-center py-4">Enter a URL and click "Load Dashboard" to see it here.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
