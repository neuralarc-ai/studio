
'use server';

import type { MonthlyUserPerformance, UserPerformanceScore, WeeklyScoreRecord, User } from '@/types';
import { getFridaysOfMonth } from '@/lib/mock-data'; // Utility function
import { database } from '@/lib/firebase';
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database';

async function getAllUsers(): Promise<User[]> {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        return Object.values(snapshot.val() as Record<string, User>);
    }
    return [];
}

async function initializePerformanceDataForUserMonth(userId: string, year: number, month: number): Promise<MonthlyUserPerformance> {
  const fridaysThisMonth = getFridaysOfMonth(year, month);
  const userMonthPath = `monthlyPerformance/${userId}/${year}/${month}`;
  const userMonthRef = ref(database, userMonthPath);
  
  const snapshot = await get(userMonthRef);
  if (snapshot.exists()) {
    const existingData = snapshot.val() as MonthlyUserPerformance;
    // Ensure all fridays are present
    fridaysThisMonth.forEach(fridayDate => {
      const weekStartDateStr = fridayDate.toISOString().split('T')[0];
      if (!existingData.weeklyScores.find(ws => ws.weekStartDate === weekStartDateStr)) {
        existingData.weeklyScores.push({ weekStartDate: weekStartDateStr, score: null });
      }
    });
    existingData.weeklyScores.sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime());
    await set(userMonthRef, existingData); // Save if modified
    return existingData;
  } else {
    const weeklyScores: WeeklyScoreRecord[] = fridaysThisMonth.map(fridayDate => ({
      weekStartDate: fridayDate.toISOString().split('T')[0],
      score: null,
    }));
    const newPerformanceData: MonthlyUserPerformance = { userId, year, month, weeklyScores };
    await set(userMonthRef, newPerformanceData);
    return newPerformanceData;
  }
}

export async function getPerformanceDataForCurrentMonth(): Promise<MonthlyUserPerformance[]> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const allUsers = await getAllUsers();
  const nonAdminUsers = allUsers.filter(u => !u.isAdmin);
  
  const performanceDataPromises = nonAdminUsers.map(async user => {
    const userMonthData = await initializePerformanceDataForUserMonth(user.id, currentYear, currentMonth);
    return {
      ...userMonthData,
      userName: user.name,
      avatarUrl: user.avatarUrl,
    };
  });

  const performanceData = await Promise.all(performanceDataPromises);
  return performanceData.sort((a,b) => (a.userName || "").localeCompare(b.userName || ""));
}

export async function updateUserWeeklyScore(payload: {
  userId: string;
  year: number;
  month: number;
  weekStartDate: string;
  score: number | null;
}): Promise<{ success: boolean; message?: string }> {
  const { userId, year, month, weekStartDate, score } = payload;

  if (score !== null && (score < 1 || score > 5)) {
    return { success: false, message: "Score must be between 1 and 5, or null." };
  }

  const userMonthPath = `monthlyPerformance/${userId}/${year}/${month}`;
  const userMonthRef = ref(database, userMonthPath);

  try {
    const snapshot = await get(userMonthRef);
    if (!snapshot.exists()) {
      // Should be initialized by getPerformanceDataForCurrentMonth, but handle defensively
      await initializePerformanceDataForUserMonth(userId, year, month);
      const newSnapshot = await get(userMonthRef); // Re-fetch
      if (!newSnapshot.exists()) {
         return { success: false, message: "Performance record for this user and month not found even after init." };
      }
    }
    
    const performanceMonthData = (await get(userMonthRef)).val() as MonthlyUserPerformance;
    const weekScoreRecord = performanceMonthData.weeklyScores.find(ws => ws.weekStartDate === weekStartDate);

    if (!weekScoreRecord) {
      // This case should ideally not happen if data is initialized correctly
      performanceMonthData.weeklyScores.push({ weekStartDate, score });
    } else {
      weekScoreRecord.score = score;
    }
    await set(userMonthRef, performanceMonthData);
    return { success: true, message: "Score updated." };
  } catch (error) {
    console.error("Error updating weekly score:", error);
    return { success: false, message: "Failed to update score in database." };
  }
}

export async function calculateMonthlyLeaderboard(): Promise<UserPerformanceScore[]> {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const allUsers = await getAllUsers();
  const nonAdminUsers = allUsers.filter(u => !u.isAdmin);
  const leaderboard: UserPerformanceScore[] = [];

  for (const user of nonAdminUsers) {
    const userMonthPath = `monthlyPerformance/${user.id}/${currentYear}/${currentMonth}`;
    const userMonthRef = ref(database, userMonthPath);
    const snapshot = await get(userMonthRef);
    
    let totalScore = 0;
    let weeksScored = 0;

    if (snapshot.exists()) {
      const performanceRecord = snapshot.val() as MonthlyUserPerformance;
      performanceRecord.weeklyScores.forEach(ws => {
        if (ws.score !== null && ws.score !== undefined) {
          totalScore += ws.score;
          weeksScored++;
        }
      });
    } else {
        // Ensure data exists for this user if they are in MOCK_USERS_ARRAY
        await initializePerformanceDataForUserMonth(user.id, currentYear, currentMonth);
        // No scores if just initialized
    }
    
    const averageScore = weeksScored > 0 ? totalScore / weeksScored : 0;

    leaderboard.push({
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      score: parseFloat(averageScore.toFixed(2)),
    });
  }

  leaderboard.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.userName || "").localeCompare(b.userName || "");
  });

  return leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
