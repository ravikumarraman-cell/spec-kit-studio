import { expect, test } from '@playwright/test';

test('keeps app installation discoverable without a native browser prompt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'More' }).click();

  const installEntry = page.getByRole('button', { name: /Install app.*Desktop, mobile, and offline shell/ });
  await expect(installEntry).toBeVisible();
  await installEntry.click();

  await expect(page.getByRole('dialog', { name: 'Install Spec-Kit Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Install Spec-Kit Studio' })).toBeVisible();
  await expect(page.getByText(/Click (the app icon in Edge’s|Install in Chrome’s) address bar/)).toBeVisible();
});

test('offers installation from the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Menu' }).click();
  await page.getByRole('button', { name: 'Install app', exact: true }).click();

  await expect(page.getByRole('dialog', { name: 'Install Spec-Kit Studio' })).toBeVisible();
});

test('uses the deferred native installer when the browser provides one', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const installPrompt = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(installPrompt, {
      prompt: { value: () => { (window as typeof window & { installPromptCalled?: boolean }).installPromptCalled = true; return Promise.resolve(); } },
      userChoice: { value: Promise.resolve({ outcome: 'accepted', platform: 'web' }) },
    });
    window.dispatchEvent(installPrompt);
  });

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Install app.*Desktop, mobile, and offline shell/ }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as typeof window & { installPromptCalled?: boolean }).installPromptCalled))).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Install Spec-Kit Studio' })).toBeHidden();
});