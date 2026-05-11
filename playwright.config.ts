import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Port 3030 is used for the psk dev server so it doesn't clash with other
  // projects that may be running on the default 3000.
  use: { baseURL: 'http://localhost:3030' },
  webServer: {
    command: 'npm run dev -- --port 3030',
    url: 'http://localhost:3030',
    reuseExistingServer: !process.env.CI,
    env: { MOCK_OPENAI: 'true' },
  },
});
