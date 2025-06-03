
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { MonthlyUserPerformance } from '@/types';
import { getPerformanceDataForCurrentMonth, updateUserWeeklyScore } from '@/app/actions/performance';
import { getFridaysOfMonth } from '@/lib/mock-data'; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from 'date-fns';

interface EditableScoreCellProps {
  userId: string;
  year: number;
  month: number;
  weekStartDate: string;
  currentScore?: number | null;
  onScoreUpdate: (userId: string, weekStartDate: string, score: number | null) => Promise<void>;
}

function EditableScoreCell({ userId, year, month, weekStartDate, currentScore, onScoreUpdate }: EditableScoreCellProps) {
  const [inputValue, setInputValue] = useState<string>(currentScore?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setInputValue(currentScore?.toString() || '');
  }, [currentScore]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only empty string or numbers 1-5
    if (value === '' || (/^[1-5]$/.test(value) && value.length === 1)) {
      setInputValue(value);
    } else if (/^\d+$/.test(value)) { // if it's a number but not 1-5
        const num = parseInt(value, 10);
        if (num > 5) setInputValue('5');
        else if (num < 1 && value !== '') setInputValue('1'); // if they type 0, set to 1
        else setInputValue(value.slice(0,1)); // handles multi-digit numbers like "12" -> "1"
    } else if (value !== '' && !/^[1-5]$/.test(value)) {
      // If it's not a number and not empty, don't update, or clear it.
      // For this iteration, let's keep it simple and just not update if invalid char is typed beyond first digit.
      // A more complex solution would strip non-numeric chars.
    }
  };

  const handleBlur = async () => {
    let scoreToSave: number | null = null;
    const parsedValue = parseInt(inputValue, 10);

    if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 5) {
      scoreToSave = parsedValue;
    } else if (inputValue !== '') {
      // If input is not empty but invalid, clear it or reset to original
      // For now, let's assume it means clear if invalid after trying to type
      setInputValue(currentScore?.toString() || ''); // Revert to original or empty
      toast({ title: "Invalid Input", description: "Score must be between 1-5 or empty.", variant: "destructive"});
      return; 
    }
    
    // Only save if the value to save is different from current stored score
    if (scoreToSave === currentScore && (currentScore !== null || inputValue === '')) { // handles null score vs empty input
      if (scoreToSave === null && inputValue !== '') {
         // This case means input was invalid and we are clearing it
      } else if (scoreToSave === null && inputValue === '' && currentScore === null){
        // No change if both are null/empty
        return;
      } else if (scoreToSave !== null && scoreToSave === currentScore) {
        // No change if value is same
        return;
      }
    }


    setIsSaving(true);
    try {
      await onScoreUpdate(userId, weekStartDate, scoreToSave);
      // The fetchPerformanceData in the parent will update currentScore, triggering useEffect here
    } catch (error) {
      toast({ title: "Error", description: "Failed to save score.", variant: "destructive"});
      setInputValue(currentScore?.toString() || ''); // Revert on error
    }
    setIsSaving(false);
  };
  
  return (
    <div className="flex items-center w-16">
      <Input
        type="text" // Using text for more control, but guiding numeric input
        inputMode="numeric" // Hint for mobile keyboards
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="h-8 w-12 text-sm text-center bg-input border-input-border focus:ring-primary px-1"
        placeholder="-"
        maxLength={1} // Restrict to single digit 1-5
        disabled={isSaving}
      />
      {isSaving && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
    </div>
  );
}


export default function TeamPerformancePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [performanceData, setPerformanceData] = useState<MonthlyUserPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonthFridays, setCurrentMonthFridays] = useState<Date[]>([]);
  const [currentMonthName, setCurrentMonthName] = useState('');

  const fetchPerformanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPerformanceDataForCurrentMonth();
      setPerformanceData(data.map(p => ({
        ...p,
        totalScore: p.weeklyScores.reduce((sum, ws) => sum + (ws.score || 0), 0),
        averageScore: p.weeklyScores.filter(ws => ws.score !== null && ws.score !== undefined).length > 0
          ? parseFloat((p.weeklyScores.reduce((sum, ws) => sum + (ws.score || 0), 0) / p.weeklyScores.filter(ws => ws.score !== null && ws.score !== undefined).length).toFixed(2))
          : 0,
      })));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load performance data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    const today = new Date();
    setCurrentMonthFridays(getFridaysOfMonth(today.getFullYear(), today.getMonth()));
    setCurrentMonthName(format(today, "MMMM yyyy"));
    if (user && user.isAdmin) {
      fetchPerformanceData();
    } else if (!authLoading && (!user || !user.isAdmin)) {
      // router.replace('/dashboard'); // Or handle unauthorized access
    }
  }, [user, authLoading, fetchPerformanceData]);

  const handleScoreUpdate = async (userId: string, weekStartDate: string, score: number | null) => {
    const today = new Date();
    const result = await updateUserWeeklyScore({
      userId,
      year: today.getFullYear(),
      month: today.getMonth(),
      weekStartDate,
      score,
    });
    if (result.success) {
      toast({ title: "Success", description: "Score updated successfully." });
      fetchPerformanceData(); // Re-fetch data to update totals and averages
    } else {
      toast({ title: "Error", description: result.message || "Failed to update score.", variant: "destructive" });
      // Optionally re-fetch even on error if local state might be out of sync
      fetchPerformanceData();
    }
  };
  
  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  if (authLoading || (!user || !user.isAdmin)) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground flex items-center">
          <Award className="mr-3 h-8 w-8 text-primary" /> Team Performance
        </h1>
        <Button onClick={fetchPerformanceData} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh Data
        </Button>
      </div>
      <p className="text-muted-foreground">
        Manage weekly scores for team members for {currentMonthName}. Scores are from 1 (Low) to 5 (High). Input is saved on clicking away.
      </p>

      <Card className="shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-headline text-foreground">Weekly Scores - {currentMonthName}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter scores (1-5) for each user per week. Weeks start on Friday.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : performanceData.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No team members found or data not yet available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] min-w-[180px]">User</TableHead>
                    {currentMonthFridays.map(friday => (
                      <TableHead key={friday.toISOString()} className="text-center min-w-[100px]">
                        Fri, {format(friday, "MMM d")}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[80px]">Total</TableHead>
                    <TableHead className="text-right min-w-[80px]">Avg.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((perf) => (
                    <TableRow key={perf.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={perf.avatarUrl} alt={perf.userName} />
                            <AvatarFallback>{getInitials(perf.userName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{perf.userName}</span>
                        </div>
                      </TableCell>
                      {currentMonthFridays.map(friday => {
                        const weekStartDateStr = friday.toISOString().split('T')[0];
                        const weeklyScore = perf.weeklyScores.find(ws => ws.weekStartDate === weekStartDateStr);
                        return (
                          <TableCell key={weekStartDateStr} className="text-center">
                            <EditableScoreCell
                              userId={perf.userId}
                              year={perf.year}
                              month={perf.month}
                              weekStartDate={weekStartDateStr}
                              currentScore={weeklyScore?.score}
                              onScoreUpdate={handleScoreUpdate}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium text-foreground">{perf.totalScore || 0}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{perf.averageScore?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                 <TableCaption>Scores are saved automatically when changed. Weeks begin on the listed Friday.</TableCaption>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
