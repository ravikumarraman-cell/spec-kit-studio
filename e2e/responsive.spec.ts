import { expect, Page, test } from '@playwright/test';
import { SAMPLE_PROJECTS } from '../src/lib/sampleData';

const viewports = {
  'compact mobile': { width: 320, height: 568 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

const workspaceViews = [
  'Workspace Hub',
  'Feature Spec',
  'Architecture Plan',
  'Phased Task Board',
  'Constitution Rules',
  'AI Agent Prompts',
  'Spec Quality Audit',
  'Migrate workspace',
  'Advanced workspace export',
] as const;

const sidebarViews = ['Feature Journey', 'Connected Workspace', 'Outcome Refinery', 'Other work', 'Settings'] as const;

type Viewport = (typeof viewports)[keyof typeof viewports];

type ViewportLeak = {
  element: string;
  text: string;
  left: number;
  right: number;
};

/**
 * The production starter workspace deliberately has no delivery selected.
 * Responsive navigation needs to cover both that neutral state and the
 * feature-journey shell, so each test starts with a compact, valid feature
 * selected through the same persisted-workspace migration path as the app.
 */
function responsiveProjectFixture() {
  const project = structuredClone(SAMPLE_PROJECTS[0]);
  const now = '2026-01-01T00:00:00.000Z';
  const featureId = 'responsive-audit-feature';
  project.featureInbox = [{
    id: featureId,
    scope: 'feature',
    featureKey: 'FEAT-2026-1',
    slug: 'responsive-audit-feature',
    title: 'Responsive audit feature',
    summary: 'A stable delivery context for shell-level responsive verification.',
    source: 'preset',
    importedAt: now,
    userStoryIds: ['US-101'],
    requirementIds: ['FR-101'],
    taskIds: [],
  }];
  project.journey = {
    featureId,
    activeStage: 1,
    completedStages: [],
    startedAt: now,
    updatedAt: now,
  };
  return project;
}

async function openStudio(page: Page, viewport: Viewport) {
  await page.setViewportSize(viewport);
  const project = responsiveProjectFixture();
  await page.addInitScript(({ fixture, activeProjectId }) => {
    localStorage.setItem('speckit_studio_projects_v1', JSON.stringify([fixture]));
    localStorage.setItem('speckit_studio_active_project_id', activeProjectId);
  }, { fixture: project, activeProjectId: project.id });
  await page.goto('/');
  await expect(page.getByText('Initializing Spec-Kit Studio...')).toBeHidden({ timeout: 15_000 });
  await expect(page.locator('.studio-header')).toBeVisible();
}

async function waitForWorkspace(page: Page) {
  await page.getByRole('region', { name: 'Loading workspace' }).waitFor({ state: 'hidden' });
}

async function findViewportLeaks(page: Page, rootSelector = 'body'): Promise<ViewportLeak[]> {
  return page.locator(rootSelector).evaluate((root) => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const rootElement = root as HTMLElement;

    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < viewportHeight;
    };

    const hasContainingAncestor = (element: Element) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== rootElement && ancestor !== document.body && ancestor !== document.documentElement) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden' || overflow === 'clip') return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };

    return [...root.querySelectorAll('*')]
      .filter((element) => {
        if (!isVisible(element) || hasContainingAncestor(element)) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 20)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 3).join('.')}`,
          text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      });
  });
}

async function expectNoViewportLeaks(page: Page, rootSelector = 'body') {
  expect(await findViewportLeaks(page, rootSelector)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
}

async function selectWorkspaceView(page: Page, name: (typeof workspaceViews)[number], targetViewport: Viewport) {
  await page.setViewportSize(viewports.mobile);
  await page.getByRole('button', { name: 'Open Menu' }).click();
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await waitForWorkspace(page);
  await page.setViewportSize(targetViewport);
}

async function selectSidebarView(page: Page, name: (typeof sidebarViews)[number], targetViewport: Viewport) {
  await page.setViewportSize(viewports.desktop);

  if (name === 'Feature Journey') {
    await page.getByText('Feature journey', { exact: true }).click();
  } else if (name === 'Connected Workspace') {
    const connectorSetup = page.getByRole('button', { name: 'Set up local connector' });
    if (await connectorSetup.isVisible()) {
      await connectorSetup.click();
    } else {
      const completedStages = page.getByRole('button', { name: /completed stages?.*show/i });
      if (await completedStages.isVisible()) await completedStages.click();
      await page.getByRole('button', { name: /View approved evidence for Connect safely/i }).click();
    }
  } else if (name === 'Other work') {
    await page.locator('summary').filter({ hasText: 'Other work' }).click();
    await page.getByRole('button', { name: /Other work.*Bug or assessment/ }).click();
  } else {
    await page.getByRole('button', { name, exact: true }).click();
  }

  await waitForWorkspace(page);
  await page.setViewportSize(targetViewport);
}

async function expectDialogWithinViewport(page: Page, name: string) {
  const dialog = page.getByRole('dialog', { name });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
  await expectNoViewportLeaks(page, '[role="dialog"]');
}

for (const [label, viewport] of Object.entries(viewports)) {
  test(`application shell and every workspace view fit the ${label} viewport`, async ({ page }) => {
    await openStudio(page, viewport);
    await waitForWorkspace(page);
    await expectNoViewportLeaks(page);

    for (const view of workspaceViews) {
      await selectWorkspaceView(page, view, viewport);
      await expectNoViewportLeaks(page, '[data-testid="workspace-viewport"]');
    }

    for (const view of sidebarViews) {
      await selectSidebarView(page, view, viewport);
      await expectNoViewportLeaks(page, '[data-testid="workspace-viewport"]');
    }
  });
}

test('compact mobile header preserves primary actions and touch targets', async ({ page }) => {
  await openStudio(page, viewports['compact mobile']);
  const search = page.getByTitle('Search specs, tasks, architecture, or ⌘K');
  const menu = page.getByRole('button', { name: 'Open Menu' });

  await expect(search).toBeVisible();
  await expect(menu).toBeVisible();
  for (const control of [search, menu]) {
    const bounds = await control.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(40);
    expect(bounds!.width).toBeGreaterThanOrEqual(40);
  }
  await expectNoViewportLeaks(page, 'header');
});

test('mobile navigation and global dialogs remain operable on compact mobile', async ({ page }) => {
  await openStudio(page, viewports['compact mobile']);

  await page.getByRole('button', { name: 'Open Menu' }).click();
  const mobileNavigation = page.getByRole('dialog', { name: 'Mobile navigation' });
  await expect(mobileNavigation).toBeVisible();
  const closeMenu = page.getByRole('button', { name: 'Close menu' });
  await expect(closeMenu).toBeVisible();
  const closeMenuBounds = await closeMenu.boundingBox();
  expect(closeMenuBounds!.width).toBeGreaterThanOrEqual(40);
  expect(closeMenuBounds!.height).toBeGreaterThanOrEqual(40);
  await expectNoViewportLeaks(page);
  await closeMenu.click();

  await page.getByTitle('Search specs, tasks, architecture, or ⌘K').click();
  await expectDialogWithinViewport(page, 'Quick search');
  await page.getByRole('dialog', { name: 'Quick search' }).locator('button').first().click();

  await page.getByRole('button', { name: 'Open Menu' }).click();
  await page.getByRole('button', { name: 'AI Spec Generator', exact: true }).click();
  await expectDialogWithinViewport(page, 'AI Spec Generator');
  await page.getByRole('dialog', { name: 'AI Spec Generator' }).locator('button').first().click();

  await page.getByRole('button', { name: 'Open Menu' }).click();
  await page.getByRole('button', { name: 'GitHub & Jira Sync' }).click();
  await expectDialogWithinViewport(page, 'Integrations and direct sync');
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Open Menu' }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expectDialogWithinViewport(page, 'Create New Spec Workspace');
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('Kit Guide remains reachable and contained on short compact screens', async ({ page }) => {
  await openStudio(page, viewports['compact mobile']);
  await page.getByRole('button', { name: 'Open Kit Guide' }).click();

  const guide = page.getByRole('complementary', { name: 'Kit Guide' });
  await expect(guide).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close Kit Guide' })).toBeVisible();
  const bounds = await guide.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewports['compact mobile'].width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewports['compact mobile'].height);
});

for (const [label, viewport] of Object.entries(viewports)) {
  test(`GitHub Pages site fits the ${label} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/docs/index.html');
    await expect(page.getByRole('heading', { name: 'Spec-Kit Studio', level: 1 })).toBeVisible();
    await expect(page.locator('.hero-visual img')).toHaveJSProperty('complete', true);
    await expectNoViewportLeaks(page);

    const faq = page.locator('#faq');
    await faq.scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Frequently asked questions about Spec-Kit Studio.' })).toBeVisible();
    await expect(page.getByText('Spec-Kit Studio is an open-source, local-first workspace')).toBeVisible();
    await expectNoViewportLeaks(page, '#faq');
  });
}
