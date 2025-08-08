# Google Calendar Integration Setup

Follow this guide to enable Google Calendar synchronization for TracknStick API.

## 1) Create Google Cloud Project
- Go to the Google Cloud Console: https://console.cloud.google.com/
- Create a new project (or select an existing one).

## 2) Enable Google Calendar API
- In the selected project, open "APIs & Services" → "Library".
- Search for "Google Calendar API".
- Click "Enable".

## 3) Configure OAuth consent screen
- Go to "APIs & Services" → "OAuth consent screen".
- User Type: External.
- App name: TracknStick (or your preferred name).
- Support email: your email.
- Scopes: add `.../auth/calendar` and `.../auth/calendar.events`.
- Test users: add your Google account(s) for testing.
- Save and continue until published (keep in Testing until review is needed).

## 4) Create OAuth 2.0 Credentials
- Go to "APIs & Services" → "Credentials".
- Click "Create Credentials" → "OAuth client ID".
- Application type: Web application.
- Name: TracknStick API OAuth Client.
- Authorized redirect URIs (add the ones you’ll use):
  - Local dev: `http://localhost:3000/api/v1/google/callback`
  - Production: `https://tracknstick.com/api/v1/google/callback` (adjust domain if different)
- Create and note the Client ID and Client Secret.

## 5) Configure credentials in Cloudflare Workers
We use Wrangler secrets for sensitive values.

- Required secrets/vars:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (must exactly match one of your Google OAuth redirect URIs)

- Set them for local dev:
  ```sh
  wrangler secret put GOOGLE_CLIENT_ID
  wrangler secret put GOOGLE_CLIENT_SECRET
  wrangler secret put GOOGLE_REDIRECT_URI
  ```
- Set them for remote/prod (if applicable):
  ```sh
  wrangler secret put GOOGLE_CLIENT_ID --remote
  wrangler secret put GOOGLE_CLIENT_SECRET --remote
  wrangler secret put GOOGLE_REDIRECT_URI --remote
  ```

## 6) Scopes used
We request the following scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

These allow creating, updating, and deleting events in the user’s calendars.

## 7) Connect a Google account (OAuth flow)
- Start auth: `GET /api/v1/google/auth` (requires Clerk auth). Returns a 302 redirect to Google.
- After consenting, Google redirects back to `/api/v1/google/callback`.
- The API exchanges the code for tokens and stores them for your user.

## 8) Testing the flow
- Run the API: `pnpm dev`.
- Visit `http://localhost:3000/api/v1/google/auth` with a valid `Authorization: Bearer <clerk-jwt>`.
- Approve consent, ensure you return to the app and tokens are saved.

## 9) Troubleshooting
- Ensure `GOOGLE_REDIRECT_URI` matches exactly in Google console and Wrangler secrets.
- If you see `invalid_grant`, your OAuth client or redirect URI are likely mismatched.
- Verify your Google account is added as a Test user on the consent screen while in Testing mode.