# Deployment Guide

## Automated Deployments with GitHub Actions

The TrackNStick API is automatically deployed to Cloudflare Workers when changes are merged to the `main` branch using GitHub Actions.

### Setup Instructions

1. In your GitHub repository, go to "Settings" > "Secrets and variables" > "Actions"

2. Add the following repository secrets:

   - `CF_API_TOKEN`: Your Cloudflare API token with Workers deployment permissions
   - `CF_ACCOUNT_ID`: Your Cloudflare account ID
   - `CLERK_SECRET_KEY`: Your Clerk secret key

### Setting Up GitHub Environments

To see deployment status indicators in your repository:

1. In your GitHub repository, go to "Settings" > "Environments"
2. Click "New environment"
3. Name it "production"
4. (Optional) Add any environment-specific protection rules or secrets
5. Click "Configure environment"

After setting up the environment, your deployments will be visible in the repository:

- On the repository home page in the "Environments" section
- Under the "Deployments" tab in the repository navigation

You'll be able to see:

- Deployment history
- Current deployment status
- Links to deployed environments
- Deployment logs and details

### How to Create Cloudflare API Token

1. Log in to the Cloudflare dashboard
2. Go to "My Profile" > "API Tokens"
3. Click "Create Token"
4. Select "Edit Cloudflare Workers" template
5. Adjust permissions if needed (ensure it has access to Workers and D1)
6. Set the Account Resources to your specific account
7. Create the token and copy it to your GitHub secrets

### How to Find Your Cloudflare Account ID

1. Log in to the Cloudflare dashboard
2. Navigate to Workers
3. Your Account ID is visible in the right sidebar or in the URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/workers`

### Deployment Process

When a pull request is merged to the `main` branch:

1. GitHub Actions will automatically trigger the deployment workflow
2. The code will be built and deployed to Cloudflare Workers
3. The deployment status will be visible in the GitHub repository under "Environments"
4. You can view the deployment history by clicking on the "Deployments" link in the repository sidebar

### Manual Deployment

If you need to deploy manually:

```bash
# Make sure you're logged in to Cloudflare
npx wrangler login

# Deploy
npm run deploy
```
