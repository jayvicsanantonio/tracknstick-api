# Statistics Examples

This document provides practical examples of how to retrieve and display habit statistics using the TracknStick API.

## Basic Statistics

### Get Overall Statistics

```javascript
async function getOverallStatistics() {
  try {
    const token = await getToken();
    const response = await fetch(
      'http://localhost:3000/api/v1/statistics/overall',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch overall statistics:', error);
    throw error;
  }
}

// Usage in React component
function StatisticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getOverallStatistics();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No statistics available</div>;

  return (
    <div className="statistics-dashboard">
      <h2>Overall Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Habits</h3>
          <p>{stats.totalHabits}</p>
        </div>
        <div className="stat-card">
          <h3>Completion Rate</h3>
          <p>{stats.completionRate}%</p>
        </div>
        <div className="stat-card">
          <h3>Current Streak</h3>
          <p>{stats.currentStreak} days</p>
        </div>
        <div className="stat-card">
          <h3>Best Streak</h3>
          <p>{stats.bestStreak} days</p>
        </div>
      </div>
    </div>
  );
}
```

### Get Habit-Specific Statistics

```javascript
async function getHabitStatistics(habitId, { startDate, endDate } = {}) {
  try {
    const token = await getToken();
    let url = `http://localhost:3000/api/v1/statistics/habits/${habitId}`;

    // Add date range parameters if provided
    const params = new URLSearchParams();
    if (startDate)
      params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch statistics for habit ${habitId}:`, error);
    throw error;
  }
}

// Usage in React component
function HabitStatistics({ habitId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getHabitStatistics(habitId, dateRange);
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [habitId, dateRange]);

  if (loading) return <div>Loading habit statistics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No statistics available</div>;

  return (
    <div className="habit-statistics">
      <h3>Habit Statistics</h3>
      <div className="date-range-picker">
        <input
          type="date"
          value={dateRange.startDate.toISOString().split('T')[0]}
          onChange={(e) =>
            setDateRange((prev) => ({
              ...prev,
              startDate: new Date(e.target.value),
            }))
          }
        />
        <input
          type="date"
          value={dateRange.endDate.toISOString().split('T')[0]}
          onChange={(e) =>
            setDateRange((prev) => ({
              ...prev,
              endDate: new Date(e.target.value),
            }))
          }
        />
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Completion Rate</h4>
          <p>{stats.completionRate}%</p>
        </div>
        <div className="stat-card">
          <h4>Current Streak</h4>
          <p>{stats.currentStreak} days</p>
        </div>
        <div className="stat-card">
          <h4>Best Streak</h4>
          <p>{stats.bestStreak} days</p>
        </div>
        <div className="stat-card">
          <h4>Total Completions</h4>
          <p>{stats.totalCompletions}</p>
        </div>
      </div>
    </div>
  );
}
```

## Advanced Statistics

### Get Weekly Statistics

```javascript
async function getWeeklyStatistics({ startDate, endDate } = {}) {
  try {
    const token = await getToken();
    let url = 'http://localhost:3000/api/v1/statistics/weekly';

    // Add date range parameters if provided
    const params = new URLSearchParams();
    if (startDate)
      params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch weekly statistics:', error);
    throw error;
  }
}

// Usage in React component with Chart.js
function WeeklyStatisticsChart() {
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    async function fetchWeeklyStats() {
      try {
        const data = await getWeeklyStatistics();
        setWeeklyStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWeeklyStats();
  }, []);

  useEffect(() => {
    if (!weeklyStats.length || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: weeklyStats.map((stat) => stat.week),
        datasets: [
          {
            label: 'Completion Rate',
            data: weeklyStats.map((stat) => stat.completionRate),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }, [weeklyStats]);

  if (loading) return <div>Loading weekly statistics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="weekly-statistics">
      <h3>Weekly Statistics</h3>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
```

### Get Monthly Statistics

```javascript
async function getMonthlyStatistics(year) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/statistics/monthly?year=${year}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch monthly statistics for ${year}:`, error);
    throw error;
  }
}

// Usage in React component with Chart.js
function MonthlyStatisticsChart() {
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const chartRef = useRef(null);

  useEffect(() => {
    async function fetchMonthlyStats() {
      try {
        const data = await getMonthlyStatistics(selectedYear);
        setMonthlyStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthlyStats();
  }, [selectedYear]);

  useEffect(() => {
    if (!monthlyStats.length || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyStats.map((stat) => stat.month),
        datasets: [
          {
            label: 'Completion Rate',
            data: monthlyStats.map((stat) => stat.completionRate),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }, [monthlyStats]);

  if (loading) return <div>Loading monthly statistics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="monthly-statistics">
      <h3>Monthly Statistics</h3>
      <div className="year-selector">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {Array.from(
            { length: 5 },
            (_, i) => new Date().getFullYear() - i
          ).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
```

## Comparative Statistics

### Compare Habits

```javascript
async function compareHabits(habitIds, { startDate, endDate } = {}) {
  try {
    const token = await getToken();
    let url = 'http://localhost:3000/api/v1/statistics/compare';

    // Add parameters
    const params = new URLSearchParams();
    habitIds.forEach((id) => params.append('habitIds', id));
    if (startDate)
      params.append('startDate', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);

    url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to compare habits:', error);
    throw error;
  }
}

// Usage in React component with Chart.js
function HabitComparisonChart({ habitIds }) {
  const [comparisonStats, setComparisonStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const chartRef = useRef(null);

  useEffect(() => {
    async function fetchComparisonStats() {
      try {
        const data = await compareHabits(habitIds, dateRange);
        setComparisonStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchComparisonStats();
  }, [habitIds, dateRange]);

  useEffect(() => {
    if (!comparisonStats.length || !chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: [
          'Completion Rate',
          'Current Streak',
          'Best Streak',
          'Consistency',
        ],
        datasets: comparisonStats.map((stat) => ({
          label: stat.habitName,
          data: [
            stat.completionRate,
            stat.currentStreak,
            stat.bestStreak,
            stat.consistency,
          ],
          fill: true,
          backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`,
          borderColor: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
          pointBackgroundColor: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
        })),
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }, [comparisonStats]);

  if (loading) return <div>Loading comparison statistics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="habit-comparison">
      <h3>Habit Comparison</h3>
      <div className="date-range-picker">
        <input
          type="date"
          value={dateRange.startDate.toISOString().split('T')[0]}
          onChange={(e) =>
            setDateRange((prev) => ({
              ...prev,
              startDate: new Date(e.target.value),
            }))
          }
        />
        <input
          type="date"
          value={dateRange.endDate.toISOString().split('T')[0]}
          onChange={(e) =>
            setDateRange((prev) => ({
              ...prev,
              endDate: new Date(e.target.value),
            }))
          }
        />
      </div>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
```

Last Updated: 2024-03-21
