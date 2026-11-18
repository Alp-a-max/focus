const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname, testMatch: '*.spec.cjs', timeout: 45000, workers: 1,
  use: {baseURL: process.env.ODAK_TEST_URL || 'http://127.0.0.1:8768', browserName: 'chromium',
    launchOptions: {executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true}}
});
