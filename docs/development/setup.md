# Development Environment Setup

This document provides detailed instructions for setting up a development environment for the TracknStick API.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or later) - [Download](https://nodejs.org/)
- **npm** (included with Node.js)
- **Git** - [Download](https://git-scm.com/downloads)
- **SQLite** - [Download](https://www.sqlite.org/download.html) (optional, as npm dependencies include SQLite)
- A code editor (VS Code recommended - [Download](https://code.visualstudio.com/))

## Getting the Source Code

1. Clone the repository:

   ```bash
   git clone https://github.com/jayvicsanantonio/tracknstick-api.git
   cd tracknstick-api
   ```

2. (Optional) If you're contributing to an existing project, fork the repository first and then clone your fork:
   ```bash
   git clone https://github.com/your-username/tracknstick-api.git
   cd tracknstick-api
   git remote add upstream https://github.com/jayvicsanantonio/tracknstick-api.git
   ```

## Installing Dependencies

Install all required dependencies:

```bash
npm install
```

This will install all dependencies listed in `package.json`, including:

- Express.js
- SQLite and Knex.js
- Clerk authentication
- ESLint and Prettier
- Other project dependencies

## Environment Configuration

1. Create a `.env` file in the project root:

   ```bash
   cp .env.example .env  # If an example file exists
   # Or create a new .env file manually
   ```

2. Edit the `.env` file with your preferred text editor and add the following variables:

   ```
   PORT=3000
   NODE_ENV=development

   # Clerk API Keys (Get from Clerk Dashboard)
   CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
   CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

   # Optional: Database Path
   # DATABASE_PATH=./tracknstick.db

   # Optional: Rate Limiting
   # RATE_LIMIT_WINDOW_MS=900000
   # RATE_LIMIT_MAX_REQUESTS=100
   ```

3. Replace the placeholder Clerk keys with your own test keys from the [Clerk Dashboard](https://dashboard.clerk.dev/).

## Database Setup

1. Initialize the database with all migrations:

   ```bash
   npm run db:migrate
   ```

   This creates the SQLite database file (`tracknstick.db` by default) and sets up the required tables.

2. (Optional) To rollback the most recent migration batch:

   ```bash
   npm run db:rollback
   ```

3. (Optional) To create a new migration file:
   ```bash
   npm run db:make-migration -- my_migration_name
   ```

## Running the Application

Start the development server (with auto-restart on file changes):

```bash
npm start
```

The API will be accessible at `http://localhost:3000` (or the port specified in your `.env` file).

## Code Quality Tools

### ESLint and Prettier

The project uses ESLint for linting and Prettier for code formatting.

1. To lint your code:

   ```bash
   npm run lint
   ```

2. To automatically fix lint issues:

   ```bash
   npm run lint:fix
   ```

3. To format your code with Prettier:

   ```bash
   npm run format
   ```

4. (Recommended) Configure your editor to run ESLint and Prettier automatically.
   For VS Code, install the ESLint and Prettier extensions and add the following to your settings.json:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     }
   }
   ```

## Testing

Run the test suite:

```bash
npm test
```

(Note: Actual test suite implementation may vary)

## API Testing

You can use tools like Postman, Insomnia, or curl to test the API endpoints.

Example curl request to test the API (requires authentication token):

```bash
curl -X GET "http://localhost:3000/api/v1/habits" \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

## Clerk Authentication Setup

For testing authentication:

1. Create a Clerk application at [https://dashboard.clerk.dev/](https://dashboard.clerk.dev/)
2. Configure Clerk to work with your app
3. Obtain test API keys and add them to your `.env` file
4. For development, you can use Clerk's development mode to simplify testing

## VS Code Workspace Setup (Recommended)

For an optimal development experience with VS Code:

1. Install recommended extensions:

   - ESLint
   - Prettier
   - REST Client (for API testing)
   - SQLite (for database viewing)

2. Create a `.vscode/settings.json` file:

   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "files.exclude": {
       "node_modules": true
     }
   }
   ```

3. Create a `.vscode/launch.json` file for debugging:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Launch Program",
         "skipFiles": ["<node_internals>/**"],
         "program": "${workspaceFolder}/index.js",
         "env": {
           "NODE_ENV": "development"
         }
       }
     ]
   }
   ```

## Common Issues & Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

- Check if the database file exists
- Verify file permissions
- Check the `DATABASE_PATH` in your `.env` file

### Authentication Issues

If authentication is not working:

- Verify your Clerk API keys
- Check that Clerk middleware is properly configured
- Ensure JWT tokens are correctly formatted

### Port Already in Use

If port 3000 is already in use:

- Change the `PORT` in your `.env` file
- Kill the process using port 3000: `lsof -i :3000` and `kill -9 PID`

## Next Steps

Now that your development environment is set up:

- Explore the API documentation
- Examine the codebase structure
- Review the architecture document
- Read the contribution guidelines before making changes

For more detailed information, refer to other documentation in the `/docs` directory.

Last Updated: 2024-03-21
