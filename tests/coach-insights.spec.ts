import { test, expect } from '@playwright/test';

test('Coach Insights Admin Dropdown', async ({ page }) => {
  // Navigate with admin override
  await page.goto('/?email=admin@rhwb.org');
  
  // Wait for navigation and page load
  await page.waitForSelector('h1:has-text("Coach Insights")');
  
  // Check console logs
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.text()));
  
  // Check dropdown visibility logic
  const result = await page.evaluate(() => {
    const coachInsightsComp = document.querySelector('#coach-insights');
    return {
      isAdmin: window.__REACT_APP_USER_ROLE__ === 'admin',
      availableCoachesCount: window.__REACT_APP_AVAILABLE_COACHES?.length || 0,
      coachDropdownExists: !!document.querySelector('#coach-select')
    };
  });
  
  // Output debugging information
  console.log('Debugging Info:', result);
  console.log('Console Logs:', logs);
  
  // Assertions
  expect(result.isAdmin).toBe(true);
  expect(result.availableCoachesCount).toBeGreaterThan(0);
  expect(result.coachDropdownExists).toBe(true);
});