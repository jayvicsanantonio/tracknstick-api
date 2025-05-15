# Cloudflare CI/CD Setup Guide

This guide explains how to set up the necessary GitHub secrets for automated Cloudflare Workers deployments.

## Prerequisites

1. GitHub repository for your TrackNStick API project
2. Cloudflare account with Workers subscription
3. Proper permissions to manage GitHub repository settings

## Setting Up GitHub Secrets

To enable the CI/CD workflow, you need to configure two secrets in your GitHub repository:

1. `CLOUDFLARE_API_TOKEN`: An API token with permissions to deploy Workers
2. `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Steps to Create and Configure Secrets

#### 1. Generate a Cloudflare API Token

1. Log in to your Cloudflare dashboard at https://dash.cloudflare.com
2. Navigate to "My Profile" (click your profile icon in the top right corner)
3. Select "API Tokens" from the sidebar
4. Click "Create Token"
5. Select "Use template" for the "Edit Cloudflare Workers" template
6. Under "Account Resources", select your account
7. Under "Zone Resources", select "All zones" or specific zones if needed
8. Click "Continue to summary", then "Create Token"
9. Copy the generated token immediately (you won't be able to see it again)

#### 2. Get Your Cloudflare Account ID

1. Log in to your Cloudflare dashboard
2. The account ID is visible in the URL when you're on the dashboard: `https://dash.cloudflare.com/<account-id>/...`
3. It's also available in the sidebar of the Workers section

#### 3. Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add the following secrets:
   - Name: `CLOUDFLARE_API_TOKEN`, Value: [Your API token from step 1]
   - Name: `CLOUDFLARE_ACCOUNT_ID`, Value: [Your account ID from step 2]

## Verifying the Setup

After setting up the secrets and pushing the workflow file:

1. Make a pull request to the main branch
2. Once merged, the workflow will automatically trigger
3. You can monitor the deployment process in the "Actions" tab of your GitHub repository

## Troubleshooting

- If deployments fail, check the GitHub Actions logs for specific errors
- Verify that your API token has the correct permissions
- Ensure that your wrangler.toml file is properly configured
- Confirm that the "deploy" script in package.json uses wrangler correctly

## Security Considerations

- Never commit your Cloudflare API token to the repository
- Periodically rotate your API token for enhanced security
- Use the principle of least privilege when creating API tokens
