import { test, expect } from '@playwright/test';

test('verify login flow and take screenshot', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Fill credentials
  await page.getByPlaceholder('Email').fill('yangyepope10@gmail.com');
  await page.getByPlaceholder('Password').fill('Parav1ew!');

  // Click login button
  await page.getByRole('button', { name: /登 录|Login/i }).click();

  // Wait for navigation and dashboard elements
  await expect(page).toHaveURL('/');
  
  // Wait for the side navigation to appear, signaling a successful login
  await page.waitForSelector('nav', { state: 'visible', timeout: 10000 });

  // Take full page screenshot
  await page.screenshot({ path: 'playwright-report/login-success.png', fullPage: true });

  console.log('Login successful and screenshot captured at frontend/playwright-report/login-success.png');
});
