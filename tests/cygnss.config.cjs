const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname, testMatch: 'cygnss.spec.cjs', timeout: 30000, workers: 1,
  use: {baseURL: 'http://127.0.0.1:8767', browserName: 'chromium',
    launchOptions: {executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true}}
});
