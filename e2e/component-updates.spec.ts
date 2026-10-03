import { expect, test } from '@playwright/test';

test('registers the PWA worker against the application base', async ({ page }) => {
  await page.goto('/');

  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });

  expect(workerUrl).toMatch(/\/service-worker\.js$/);
});

test('groups app and connector releases into one quiet update center', async ({ page }) => {
  await page.route('**/downloads/local-connector.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        packageName: '@spec-kit-studio/local-connector',
        version: '9.0.0',
        apiVersion: 4,
        downloadPath: '/downloads/spec-kit-studio-local-connector-9.0.0.tgz',
      }),
    });
  });
  await page.route('http://localhost:4318/health', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: 'ok',
        version: '0.1.0',
        apiVersion: 4,
        tokenRequired: false,
        tokenStatus: 'not-required',
      }),
    });
  });

  await page.goto('/');
  const updateButton = page.getByRole('button', { name: '2 component updates available' });
  await expect(updateButton).toBeVisible();
  await updateButton.click();

  const updateCenter = page.getByRole('dialog', { name: 'Component updates' });
  await expect(updateCenter.getByRole('heading', { name: 'Studio app' })).toBeVisible();
  await expect(updateCenter.getByRole('heading', { name: 'Local connector' })).toBeVisible();
  await expect(updateCenter.getByRole('button', { name: 'Reload Studio' })).toBeVisible();
  await expect(updateCenter.getByRole('button', { name: 'View update steps' })).toBeVisible();
});