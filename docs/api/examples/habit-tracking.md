# Habit Tracking Examples

This document provides practical examples of how to track habits using the TracknStick API.

## Recording Habit Completion

### Basic Habit Tracking

```javascript
async function trackHabitCompletion(habitId, date = new Date()) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}/track`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString().split('T')[0],
          status: 'completed',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to track habit ${habitId}:`, error);
    throw error;
  }
}

// Usage in React component
function TrackHabitButton({ habitId, onTrack }) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  const handleTrack = async () => {
    setIsTracking(true);
    setError(null);

    try {
      const result = await trackHabitCompletion(habitId);
      onTrack(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div>
      <button onClick={handleTrack} disabled={isTracking}>
        {isTracking ? 'Tracking...' : 'Mark as Complete'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Tracking with Notes

```javascript
async function trackHabitWithNotes(habitId, { date, status, notes }) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}/track`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date.toISOString().split('T')[0],
          status,
          notes,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to track habit ${habitId} with notes:`, error);
    throw error;
  }
}

// Usage
const trackingResult = await trackHabitWithNotes('habit-123', {
  date: new Date(),
  status: 'completed',
  notes: 'Felt great after the workout!',
});
```

## Retrieving Tracking History

### Get Tracking History for a Habit

```javascript
async function getHabitTrackingHistory(habitId, { startDate, endDate } = {}) {
  try {
    const token = await getToken();
    let url = `http://localhost:3000/api/v1/habits/${habitId}/tracking`;

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
    console.error(
      `Failed to fetch tracking history for habit ${habitId}:`,
      error
    );
    throw error;
  }
}

// Usage in React component
function HabitTrackingHistory({ habitId }) {
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });

  useEffect(() => {
    async function fetchTrackingHistory() {
      try {
        const data = await getHabitTrackingHistory(habitId, dateRange);
        setTrackingHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTrackingHistory();
  }, [habitId, dateRange]);

  if (loading) return <div>Loading tracking history...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Tracking History</h3>
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
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {trackingHistory.map((entry) => (
            <tr key={entry.date}>
              <td>{entry.date}</td>
              <td>{entry.status}</td>
              <td>{entry.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Get Tracking Status for Multiple Habits

```javascript
async function getMultipleHabitsTrackingStatus(habitIds, date = new Date()) {
  try {
    const token = await getToken();
    const dateStr = date.toISOString().split('T')[0];

    const responses = await Promise.all(
      habitIds.map((habitId) =>
        fetch(
          `http://localhost:3000/api/v1/habits/${habitId}/tracking/${dateStr}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
      )
    );

    const results = await Promise.all(
      responses.map(async (response, index) => {
        const habitId = habitIds[index];
        if (!response.ok) {
          const error = await response.json();
          return {
            habitId,
            success: false,
            error: error.message,
          };
        }
        return {
          habitId,
          success: true,
          data: await response.json(),
        };
      })
    );

    return results;
  } catch (error) {
    console.error(
      'Failed to fetch tracking status for multiple habits:',
      error
    );
    throw error;
  }
}

// Usage
const habitIds = ['habit-1', 'habit-2', 'habit-3'];
const trackingStatus = await getMultipleHabitsTrackingStatus(habitIds);

// Process results
trackingStatus.forEach((result) => {
  if (result.success) {
    console.log(`Habit ${result.habitId}: ${result.data.status}`);
  } else {
    console.error(
      `Failed to get status for habit ${result.habitId}: ${result.error}`
    );
  }
});
```

## Updating Tracking Entries

### Update a Tracking Entry

```javascript
async function updateTrackingEntry(habitId, date, updates) {
  try {
    const token = await getToken();
    const dateStr = date.toISOString().split('T')[0];

    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}/tracking/${dateStr}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Failed to update tracking entry for habit ${habitId}:`,
      error
    );
    throw error;
  }
}

// Usage
const updatedEntry = await updateTrackingEntry('habit-123', new Date(), {
  status: 'completed',
  notes: 'Updated notes for this entry',
});
```

### Batch Update Tracking Entries

```javascript
async function batchUpdateTrackingEntries(updates) {
  try {
    const token = await getToken();
    const responses = await Promise.all(
      updates.map(({ habitId, date, updates: entryUpdates }) =>
        fetch(
          `http://localhost:3000/api/v1/habits/${habitId}/tracking/${date.toISOString().split('T')[0]}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(entryUpdates),
          }
        )
      )
    );

    const results = await Promise.all(
      responses.map(async (response, index) => {
        const { habitId, date } = updates[index];
        if (!response.ok) {
          const error = await response.json();
          return {
            habitId,
            date,
            success: false,
            error: error.message,
          };
        }
        return {
          habitId,
          date,
          success: true,
          data: await response.json(),
        };
      })
    );

    return {
      successful: results.filter((r) => r.success),
      failed: results.filter((r) => !r.success),
    };
  } catch (error) {
    console.error('Failed to batch update tracking entries:', error);
    throw error;
  }
}

// Usage
const updates = [
  {
    habitId: 'habit-1',
    date: new Date(),
    updates: { status: 'completed', notes: 'First update' },
  },
  {
    habitId: 'habit-2',
    date: new Date(),
    updates: { status: 'missed', notes: 'Second update' },
  },
];

const results = await batchUpdateTrackingEntries(updates);
console.log('Successfully updated:', results.successful.length);
console.log('Failed to update:', results.failed.length);
```

## Deleting Tracking Entries

### Delete a Tracking Entry

```javascript
async function deleteTrackingEntry(habitId, date) {
  try {
    const token = await getToken();
    const dateStr = date.toISOString().split('T')[0];

    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}/tracking/${dateStr}`,
      {
        method: 'DELETE',
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

    return true;
  } catch (error) {
    console.error(
      `Failed to delete tracking entry for habit ${habitId}:`,
      error
    );
    throw error;
  }
}

// Usage in React component
function DeleteTrackingEntryButton({ habitId, date, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (
      !window.confirm('Are you sure you want to delete this tracking entry?')
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteTrackingEntry(habitId, date);
      onDelete(habitId, date);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete Entry'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

Last Updated: 2024-03-21
