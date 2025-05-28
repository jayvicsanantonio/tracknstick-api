# Migration to pnpm and fnm

This document outlines the steps to migrate from npm to pnpm and set up fnm for Node.js version management.

## Installing fnm

1. Install fnm (Fast Node Manager):

   **macOS (with Homebrew):**

   ```bash
   brew install fnm
   ```

   **Other platforms:**
   Follow instructions at https://github.com/Schniz/fnm#installation

2. Add fnm to your shell configuration (~/.zshrc or ~/.bashrc):

   ```bash
   eval "$(fnm env --use-on-cd)"
   ```

3. Restart your terminal or source your configuration file:

   ```bash
   source ~/.zshrc  # or ~/.bashrc
   ```

## Installing pnpm

1. Install pnpm globally:

   ```bash
   npm install -g pnpm
   ```

   Or using fnm:

   ```bash
   fnm install 20.12.2
   fnm use 20.12.2
   npm install -g pnpm
   ```

## Project Setup

1. Navigate to the project directory:

   ```bash
   cd /path/to/tracknstick-api
   ```

2. Set Node.js version using fnm:

   ```bash
   fnm use
   ```

   Note: fnm will automatically detect the Node.js version from the `.node-version` file

3. Remove node_modules and package-lock.json:

   ```bash
   rm -rf node_modules package-lock.json
   ```

4. Install dependencies with pnpm:

   ```bash
   pnpm install
   ```

## Verify Setup

1. Check Node.js version:

   ```bash
   node -v  # Should match the version in .node-version
   ```

2. Check pnpm version:

   ```bash
   pnpm -v  # Should be 8.0.0 or higher
   ```

3. Run the project:

   ```bash
   pnpm dev
   ```

## CI/CD Configuration

If using CI/CD pipelines, update the workflow files to use pnpm and fnm.

Example GitHub Actions setup:

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup fnm
    uses: actions/setup-node@v4
    with:
      node-version-file: '.node-version'

  - name: Install pnpm
    run: npm install -g pnpm

  - name: Install dependencies
    run: pnpm install

  - name: Build
    run: pnpm run build
```
