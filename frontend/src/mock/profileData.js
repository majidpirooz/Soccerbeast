// Mock data for ProfilePage — same rule as the other mock files.

export const currentUser = { id: 'u1', name: 'Majid', initials: 'MJ' };

export const progress = {
  weeklyPoints: 27,
  overallPoints: 142,
  history: [
    { id: 'h1', week: 'Week 11', match: 'Man City vs Arsenal', exactCount: 1 },
    { id: 'h2', week: 'Week 10', match: 'Liverpool vs Chelsea', exactCount: 0 },
    { id: 'h3', week: 'Week 9', match: 'Napoli vs Inter', exactCount: 1 },
  ],
};

export const comparisonSeries = [
  { user: currentUser, points: [8, 15, 22, 30, 34, 38] },
  { user: { id: 'u2', name: 'Sara', initials: 'SA' }, points: [6, 12, 18, 25, 33, 36] },
];

export const allUsers = [
  currentUser,
  { id: 'u2', name: 'Sara', initials: 'SA' },
  { id: 'u3', name: 'Reza', initials: 'RE' },
];

export const previousLeagues = [
  { id: 'pl1', label: 'Sunday Legends 2025-26' },
];
