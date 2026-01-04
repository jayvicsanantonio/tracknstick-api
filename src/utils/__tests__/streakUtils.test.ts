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
    // Mock date for testing relative to "now"
    const now = new Date();
    today = new Date(now);

    // Create past dates
    yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);

    threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    // Ensure timestamps are ISO strings
    trackers = [
      { timestamp: today.toISOString() },
      { timestamp: yesterday.toISOString() },
      { timestamp: twoDaysAgo.toISOString() },
      { timestamp: threeDaysAgo.toISOString() },
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
      // Create frequency for "yesterday" and "three days ago"
      const dayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
      });

      const frequencyDays = [
        dayFormatter.format(threeDaysAgo),
        dayFormatter.format(yesterday),
      ];

      // Should count "three days ago" and "yesterday" as part of streak = 2
      const result = calculateCurrentStreak(trackers, frequencyDays, timeZone);

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
      const dailyFrequency = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
      const dailyFrequency = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
