# Habit Management Examples

This document provides practical examples of how to manage habits using the TracknStick API.

## Creating a Habit

### Basic Habit Creation

```javascript
async function createHabit(name, description, frequency) {
  try {
    const token = await getToken(); // Get your auth token
    const response = await fetch('http://localhost:3000/api/v1/habits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        frequency,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create habit:', error);
    throw error;
  }
}

// Usage
const newHabit = await createHabit(
  'Daily Meditation',
  'Meditate for 10 minutes every morning',
  'daily'
);
```

### Creating a Habit with Custom Schedule

```javascript
async function createHabitWithSchedule(habitData) {
  try {
    const token = await getToken();
    const response = await fetch('http://localhost:3000/api/v1/habits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: habitData.name,
        description: habitData.description,
        frequency: habitData.frequency,
        schedule: {
          days: ['monday', 'wednesday', 'friday'],
          time: '09:00',
          timezone: 'America/New_York',
        },
        reminder: {
          enabled: true,
          time: '08:45',
          timezone: 'America/New_York',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create habit with schedule:', error);
    throw error;
  }
}

// Usage
const habitWithSchedule = await createHabitWithSchedule({
  name: 'Gym Workout',
  description: 'Strength training at the gym',
  frequency: 'weekly',
});
```

## Retrieving Habits

### Get All Habits

```javascript
async function getAllHabits() {
  try {
    const token = await getToken();
    const response = await fetch('http://localhost:3000/api/v1/habits', {
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
    console.error('Failed to fetch habits:', error);
    throw error;
  }
}

// Usage in React component
function HabitList() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHabits() {
      try {
        const data = await getAllHabits();
        setHabits(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHabits();
  }, []);

  if (loading) return <div>Loading habits...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {habits.map((habit) => (
        <li key={habit.id}>
          <h3>{habit.name}</h3>
          <p>{habit.description}</p>
          <p>Frequency: {habit.frequency}</p>
        </li>
      ))}
    </ul>
  );
}
```

### Get a Specific Habit

```javascript
async function getHabitById(habitId) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}`,
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
    console.error(`Failed to fetch habit ${habitId}:`, error);
    throw error;
  }
}

// Usage in React component
function HabitDetail({ habitId }) {
  const [habit, setHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchHabit() {
      try {
        const data = await getHabitById(habitId);
        setHabit(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHabit();
  }, [habitId]);

  if (loading) return <div>Loading habit details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!habit) return <div>Habit not found</div>;

  return (
    <div>
      <h2>{habit.name}</h2>
      <p>{habit.description}</p>
      <p>Frequency: {habit.frequency}</p>
      {habit.schedule && (
        <div>
          <h3>Schedule</h3>
          <p>Days: {habit.schedule.days.join(', ')}</p>
          <p>Time: {habit.schedule.time}</p>
        </div>
      )}
    </div>
  );
}
```

## Updating a Habit

### Basic Habit Update

```javascript
async function updateHabit(habitId, updates) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}`,
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
    console.error(`Failed to update habit ${habitId}:`, error);
    throw error;
  }
}

// Usage
const updatedHabit = await updateHabit('habit-123', {
  name: 'Updated Habit Name',
  description: 'New description',
  frequency: 'weekly',
});
```

### Updating Habit Schedule

```javascript
async function updateHabitSchedule(habitId, scheduleUpdates) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedule: {
            ...scheduleUpdates,
            timezone: scheduleUpdates.timezone || 'UTC',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to update habit schedule for ${habitId}:`, error);
    throw error;
  }
}

// Usage
const updatedSchedule = await updateHabitSchedule('habit-123', {
  days: ['monday', 'tuesday', 'thursday'],
  time: '10:00',
  timezone: 'America/Los_Angeles',
});
```

## Deleting a Habit

### Basic Habit Deletion

```javascript
async function deleteHabit(habitId) {
  try {
    const token = await getToken();
    const response = await fetch(
      `http://localhost:3000/api/v1/habits/${habitId}`,
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
    console.error(`Failed to delete habit ${habitId}:`, error);
    throw error;
  }
}

// Usage in React component
function DeleteHabitButton({ habitId, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this habit?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteHabit(habitId);
      onDelete(habitId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? 'Deleting...' : 'Delete Habit'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Batch Operations

### Creating Multiple Habits

```javascript
async function createMultipleHabits(habits) {
  try {
    const token = await getToken();
    const responses = await Promise.all(
      habits.map((habit) =>
        fetch('http://localhost:3000/api/v1/habits', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(habit),
        })
      )
    );

    const results = await Promise.all(
      responses.map(async (response, index) => {
        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            habit: habits[index],
            error: error.message,
          };
        }
        return {
          success: true,
          habit: await response.json(),
        };
      })
    );

    return {
      successful: results.filter((r) => r.success),
      failed: results.filter((r) => !r.success),
    };
  } catch (error) {
    console.error('Failed to create multiple habits:', error);
    throw error;
  }
}

// Usage
const habits = [
  {
    name: 'Morning Meditation',
    description: '10 minutes meditation',
    frequency: 'daily',
  },
  {
    name: 'Evening Reading',
    description: 'Read for 30 minutes',
    frequency: 'daily',
  },
];

const results = await createMultipleHabits(habits);
console.log('Successfully created:', results.successful.length);
console.log('Failed to create:', results.failed.length);
```

### Updating Multiple Habits

```javascript
async function updateMultipleHabits(updates) {
  try {
    const token = await getToken();
    const responses = await Promise.all(
      Object.entries(updates).map(([habitId, update]) =>
        fetch(`http://localhost:3000/api/v1/habits/${habitId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        })
      )
    );

    const results = await Promise.all(
      responses.map(async (response, index) => {
        const habitId = Object.keys(updates)[index];
        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            habitId,
            error: error.message,
          };
        }
        return {
          success: true,
          habitId,
          data: await response.json(),
        };
      })
    );

    return {
      successful: results.filter((r) => r.success),
      failed: results.filter((r) => !r.success),
    };
  } catch (error) {
    console.error('Failed to update multiple habits:', error);
    throw error;
  }
}

// Usage
const updates = {
  'habit-1': { frequency: 'weekly' },
  'habit-2': { name: 'Updated Name' },
};

const results = await updateMultipleHabits(updates);
console.log('Successfully updated:', results.successful.length);
console.log('Failed to update:', results.failed.length);
```

Last Updated: 2024-03-21
