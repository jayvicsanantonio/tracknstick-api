import { describe, it, expect, beforeEach } from 'vitest';
import { calculateCurrentStreak, updateStreakInfo } from '../streakUtils.js';

describe('streakUtils', () => {
  const timeZone = 'America/Los_Angeles';

  // Create mock tracker data - let's assume today is 2023-06-15
  let today: Date;
  let yesterday: Date;
  let twoDaysAgo: Date;
  let threeDaysAgo: Date;

  let trackers: { timestamp: string }[];

  beforeEach(() => {
    // Mock fixed date for testing (2023-06-15)
    today = new Date('2023-06-15T12:00:00Z');
    yesterday = new Date('2023-06-14T12:00:00Z');
    twoDaysAgo = new Date('2023-06-13T12:00:00Z');
    threeDaysAgo = new Date('2023-06-12T12:00:00Z');

    trackers = [
      { timestamp: today.toISOString() }, // June 15
      { timestamp: yesterday.toISOString() }, // June 14
      { timestamp: twoDaysAgo.toISOString() }, // June 13
      { timestamp: threeDaysAgo.toISOString() }, // June 12
    ];
  });

  describe('calculateCurrentStreak', () => {
    it('should return 0 for empty tracker array', () => {
      const result = calculateCurrentStreak(
        [],
        ['Mon', 'Wed', 'Fri'],
        timeZone
      );
      expect(result).toBe(0);
    });

    it('should handle invalid timezone', () => {
      const result = calculateCurrentStreak(
        trackers,
        ['Mon', 'Wed', 'Fri'],
        'invalid-timezone'
      );
      expect(result).toBe(0);
    });

    it('should calculate streak based on frequency', () => {
      // In 2023, June 12 was a Monday, June 13 Tuesday, June 14 Wednesday, June 15 Thursday
      const mondayWednesdayFrequency = ['Mon', 'Wed'];

      // Should count Monday (12th) and Wednesday (14th) as part of streak = 2
      const result = calculateCurrentStreak(
        trackers,
        mondayWednesdayFrequency,
        timeZone
      );

      // Streak should be 2 because out of the last 4 days, only 2 were on the frequency days
      expect(result).toBe(2);
    });

    it('should break streak if a day is missed', () => {
      // Create trackers with a gap
      const trackersWithGap = [
        { timestamp: today.toISOString() }, // June 15
        { timestamp: twoDaysAgo.toISOString() }, // June 13 - missing June 14
      ];

      // Every day frequency
      const dailyFrequency = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const result = calculateCurrentStreak(
        trackersWithGap,
        dailyFrequency,
        timeZone
      );

      // Streak should be 1 because we only have today
      expect(result).toBe(1);
    });
  });

  describe('updateStreakInfo', () => {
    it('should return existing longest streak for empty tracker array', () => {
      const currentStats = { streak: 5, longestStreak: 10 };
      const result = updateStreakInfo(
        [],
        ['Mon', 'Wed'],
        timeZone,
        currentStats
      );

      expect(result.streak).toBe(0);
      expect(result.longestStreak).toBe(10); // Longest streak preserved
    });

    it('should update longest streak if current streak is longer', () => {
      // Set up a scenario where current streak (4) > longestStreak (3)
      const currentStats = { streak: 2, longestStreak: 3 };

      // Every day frequency to count all trackers
      const dailyFrequency = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const result = updateStreakInfo(
        trackers,
        dailyFrequency,
        timeZone,
        currentStats
      );

      // Current streak should be 4 (all days)
      expect(result.streak).toBe(4);
      // Longest streak should be updated to 4
      expect(result.longestStreak).toBe(4);
    });

    it('should maintain longest streak if current streak is shorter', () => {
      // Set up a scenario where current streak (4) < longestStreak (10)
      const currentStats = { streak: 2, longestStreak: 10 };

      // Every day frequency
      const dailyFrequency = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const result = updateStreakInfo(
        trackers,
        dailyFrequency,
        timeZone,
        currentStats
      );

      // Current streak should be 4 (all days)
      expect(result.streak).toBe(4);
      // Longest streak should remain 10
      expect(result.longestStreak).toBe(10);
    });
  });
});
