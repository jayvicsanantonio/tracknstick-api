# Product Requirements Document: TrackNStick API

## 1. Introduction

The TrackNStick API is the backend service for the TrackNStick habit tracking application. It provides a robust and secure interface for client applications (web, mobile) to manage user habits, track their completion, and access progress statistics.

The main goal of the API is to empower users to build and maintain positive habits by offering reliable and comprehensive backend services for habit creation, management, tracking, and analysis of their progress over time.

## 2. Target Audience

The primary consumers of the TrackNStick API are:

*   **Frontend Applications:** The official TrackNStick web application and any future mobile applications developed for the platform. These applications will rely on the API for all user data management and business logic.
*   **Internal Development Team:** Developers working on the TrackNStick platform, including frontend and backend engineers who need to understand the API's capabilities for integration and further development.
*   **(Potential) Third-Party Developers:** In the future, individual developers or teams might be granted access to build integrations or companion applications using the TrackNStick API (though this is not the primary current focus).

## 3. Key Features

The TrackNStick API provides the following core capabilities:

*   **User-Centric Data Management:**
    *   All data is tied to an authenticated user (handled via Clerk integration).
    *   Ensures users can only access and modify their own data.

*   **Habit Management (CRUD Operations):**
    *   **Create Habits:** Users can define new habits with attributes such as name, icon, frequency (e.g., daily, specific days of the week), start date, and optional end date.
    *   **Read Habits:** Users can retrieve a list of their habits, optionally filtered by date.
    *   **Update Habits:** Existing habits can be modified (name, icon, frequency, etc.).
    *   **Delete Habits:** Habits and their associated tracking data can be removed.

*   **Habit Tracking:**
    *   **Record Completions:** Users can mark a habit as complete for a specific date and time.
    *   **Completion Notes:** Optional notes can be added to each completion record.
    *   **Retrieve Trackers:** Users can fetch all completion records for a specific habit, with optional date range filtering.

*   **Progress & Statistics:**
    *   **Individual Habit Statistics:** For a specific habit, retrieve:
        *   Current streak.
        *   Longest streak.
        *   Total number of completions.
        *   Last completed date.
        *   Overall completion rate.
        *   Average completions per week (or other relevant periods).
    *   **Overall Progress History:**
        *   View daily completion rates across all habits (filterable by date range).
    *   **Overall Streak Information:**
        *   Current streak of 100% completion days across all habits.
        *   Longest streak of 100% completion days across all habits.
    *   **Progress Overview:** A consolidated view combining history and overall streak information.

*   **Authentication & Authorization:**
    *   All API endpoints (except potentially a public health check) are secured and require valid JWT authentication (via Clerk).
    *   The API enforces that users can only access and manipulate their own data.

## 4. User Stories

### User Management (Implicit)
*   As an application user, I want my data to be secure so that only I can access my habits and progress.
*   As an application user, I want my session to be managed securely so that I remain logged in reliably but am protected against unauthorized access.

### Habit Management
*   As an application user, I want to create a new habit with a name, icon, and frequency (e.g., daily, specific days, specific dates) so that I can start tracking it.
*   As an application user, I want to set a start date for my habit so that it only becomes active from that day.
*   As an application user, I want to optionally set an end date for a habit if it's for a limited duration.
*   As an application user, I want to view a list of all my habits so that I can see what I'm tracking.
*   As an application user, I want to update the details of an existing habit (like its name, icon, or frequency) so that I can adjust it as my goals change.
*   As an application user, I want to delete a habit that I no longer wish to track so that it doesn't clutter my active habits list.

### Habit Tracking
*   As an application user, I want to mark a habit as complete for a specific day (and optionally time) so that my progress is accurately recorded.
*   As an application user, I want to add a note to a habit completion so that I can remember specific details about that day's activity.
*   As an application user, I want to view all the completion records for a specific habit so that I can review my history for that habit.

### Progress & Statistics
*   As an application user, I want to see my current streak for a specific habit so that I stay motivated.
*   As an application user, I want to see my longest recorded streak for a habit so that I know what I've achieved in the past.
*   As an application user, I want to see the total number of times I've completed a habit so that I can see my overall commitment.
*   As an application user, I want to see the date I last completed a habit so I know if I'm up to date.
*   As an application user, I want to view my daily completion rate across all my habits for a given period so I can understand my overall consistency.
*   As an application user, I want to see my current and longest streaks of days where I completed 100% of my scheduled habits so I can challenge myself.
*   As an application user, I want a combined overview of my progress, including historical completion rates and overall streaks, so I get a full picture of my performance.

## 5. Future Considerations / Potential Enhancements

Based on the `docs/development/enhancements.md` document and logical next steps, the following are potential areas for future enhancements:

*   **Advanced Analytics & Reporting:**
    *   Provide more detailed insights, such as completion patterns by day of the week, month, etc.
    *   Offer visual data representations (though the API would provide raw data for this).
*   **Reminders & Notifications:**
    *   Integrate functionality for users to set reminders for their habits (would likely involve a notification service).
*   **Habit Archiving:**
    *   Allow users to archive old or paused habits instead of deleting them, preserving their history.
*   **Habit Templates or Suggestions:**
    *   Offer predefined habit templates or suggestions to help users get started.
*   **Social Features (Optional & Complex):**
    *   Allow users to (optionally) share progress with friends or participate in group challenges. This would require significant new features around privacy, groups, and shared data.
*   **More Flexible Frequency Options:**
    *   Beyond daily, weekly, monthly, allow for "every X days," "X times per week/month," etc. (The current JSON `frequency` field in the database schema changes section of the Developer Guide suggests this is already being supported or planned).
*   **Gamification:**
    *   Introduce points, badges, or levels based on habit completion and streaks.
*   **Data Export/Import:**
    *   Allow users to export their habit data or import it from other services.
*   **API Documentation Generation:**
    *   Explore tools like Swagger/OpenAPI to automatically generate interactive API documentation from code comments or route definitions. This would improve upon the current manual `endpoints.md`.
*   **Dependency Injection:**
    *   For larger applications, consider implementing a dependency injection container to manage the instantiation and wiring of services and repositories, potentially simplifying testing and maintenance.
*   **Enhanced Testing:**
    *   Continue to expand unit and integration test coverage for all API functionalities to ensure robustness.

These are potential directions and would require further planning and prioritization based on user feedback and project goals.
