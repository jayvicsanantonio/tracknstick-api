# Commands to Complete the Migration

Run these commands to finalize the migration to pnpm and fnm:

```bash
# Install fnm (if not already installed)
brew install fnm  # macOS
# For other platforms, refer to https://github.com/Schniz/fnm#installation

# Add fnm to your shell configuration
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc

# Install the specified Node.js version using fnm
fnm install 20.12.2
fnm use  # This will use the version specified in .node-version

# Install pnpm globally
npm install -g pnpm

# Clean up the existing npm installation
rm -rf node_modules package-lock.json

# Install dependencies with pnpm
pnpm install

# Verify everything works
pnpm run build

# Optional: Run the development server
pnpm run dev
```

Note: After running these commands, the project will be fully migrated to pnpm and fnm.
