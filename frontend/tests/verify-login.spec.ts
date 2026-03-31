import { test, expect } from '@playwright/test';

test('verify login flow and take screenshot', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Fill credentials using data-testid (Essential fix for connectivity)
  await page.getByTestId("email-input").fill('yangyepope10@gmail.com');
  await page.getByTestId("password-input").fill('Parav1ew!');
  
  // Click login button using data-testid
  await page.getByTestId("login-button").click();

  // Wait for navigation and dashboard elements
  await expect(page).toHaveURL('/');
  
  // Wait for the side navigation to appear, signaling a successful login
  await page.waitForSelector('nav', { state: 'visible', timeout: 10000 });

  // Take full page screenshot (Will be archived automatically by globalTeardown)
  await page.screenshot({ path: 'playwright-report/login-success.png', fullPage: true });

  console.log('Login successful and screenshot captured.');
});
