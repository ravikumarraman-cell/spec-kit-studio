import { expect, test } from '@playwright/test';

test('groups secondary and advanced destinations in the neutral sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.studio-header')).toBeVisible();

  const home = page.getByRole('button', { name: 'Home', exact: true });
  await expect(home).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => home.evaluate((element) => getComputedStyle(element, '::before').width)).toBe('4px');

  const otherWork = page.locator('summary').filter({ hasText: 'Other work' });
  const advanced = page.locator('summary').filter({ hasText: 'Advanced' });
  await expect(otherWork).toContainText('bug fix or assessment');
  await expect(advanced).toContainText('migrate a workspace');

  await otherWork.click();
  await expect(page.getByRole('button', { name: /Other work.*Bug or assessment/ })).toBeVisible();
});