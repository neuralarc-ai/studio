
import type { User, MockAvatar, MonthlyUserPerformance, WeeklyScoreRecord } from '@/types';
// Most mock data arrays like MOCK_USERS_ARRAY, projectsDB etc., will be removed or commented out
// as data will now come from Firebase.

// MOCK_USERS_ARRAY is no longer the source of truth but might be used by AuthProvider for select dropdowns.
// It will be dynamically populated from Firebase in AuthProvider.
// For initial structure, we can define it as empty or with a placeholder.
// const MOCK_USERS_ARRAY_PLACEHOLDER: User[] = [];


export const MOCK_AVATARS: MockAvatar[] = [
  { id: 'avatar-1', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=S1', name: 'Spiral Gem', aiHint: 'geometric spiral' },
  { id: 'avatar-2', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=C2', name: 'Cube Matrix', aiHint: 'abstract cube' },
  { id: 'avatar-3', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=T3', name: 'Triangle Field', aiHint: 'triangle pattern' },
  { id: 'avatar-4', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=L4', name: 'Line Weave', aiHint: 'lines intersecting' },
  { id: 'avatar-5', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=D5', name: 'Dot Grid', aiHint: 'dots concentric' },
  { id: 'avatar-6', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=H6', name: 'Hexagon Net', aiHint: 'hexagon mesh' },
  { id: 'avatar-7', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=W7', name: 'Wave Form', aiHint: 'wave pattern' },
  { id: 'avatar-8', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=X8', name: 'Cross Grid', aiHint: 'crosshatch design' },
  { id: 'avatar-9', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=P9', name: 'Pixel Bloom', aiHint: 'pixelated abstract' },
  { id: 'avatar-10', url: 'https://placehold.co/128x128/333333/FAF9F6.png?text=R0', name: 'Radial Star', aiHint: 'radial burst' },
];

// Performance data-related functions remain as they are utility.
// The actual monthlyPerformanceDB will now be in Firebase.

// Helper to get Fridays of a given month and year
export function getFridaysOfMonth(year: number, month: number): Date[] {
  const fridays: Date[] = [];
  const date = new Date(Date.UTC(year, month, 1));

  while (date.getUTCDay() !== 5) { 
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCMonth() !== month) return fridays; 
  }

  while (date.getUTCMonth() === month) {
    fridays.push(new Date(date.getTime())); 
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return fridays;
}

// initializePerformanceDataForCurrentMonth will be refactored in performance.ts actions
// to work with Firebase directly.
// This file will primarily hold MOCK_AVATARS and utility functions like getFridaysOfMonth.
