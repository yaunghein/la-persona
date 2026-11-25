// Steps mirror tests/guides/01.auth.md; keep the numbers in sync.
import { test, expect } from '@playwright/test';
import {
  gotoHydrated,
  makePlatformAdmin,
  requestMagicLink,
  signIn,
  uniqueEmail,
} from './support/auth';
import { countEmails } from './support/mailpit';

test.describe('Part 1.1: Signing in', () => {
  test('1.1.1 new user signs in', async ({ page }) => {
    const email = uniqueEmail('new');
    await gotoHydrated(page, '/sign-in');
    const link = await requestMagicLink(page, email);

    expect(await countEmails(email)).toBe(1);

    await page.goto(link);
    await expect(page).toHaveURL(/\/platform/);
    const organizations = await page.request.get('/api/me/organizations');
    expect(organizations.status()).toBe(200);
    expect(JSON.stringify(await organizations.json())).toContain('personal');
  });

  test('1.1.2 existing user signs in again', async ({ page }) => {
    const email = uniqueEmail('user');
    await signIn(page, email);
    const before = await (
      await page.request.get('/api/me/organizations')
    ).json();

    await page.context().clearCookies();
    await signIn(page, email);
    const after = await (
      await page.request.get('/api/me/organizations')
    ).json();

    expect(after).toEqual(before);
  });

  test('1.1.3 email validation on the form', async ({ page }) => {
    await gotoHydrated(page, '/sign-in');
    const send = page.getByRole('button', { name: 'Send Magic Link' });

    await send.click();
    await expect(page.getByText('Email required').first()).toBeVisible();

    await page.getByLabel('Email').fill('not-an-email');
    await send.click();
    await expect(page.getByText('Invalid email').first()).toBeVisible();
    expect(await countEmails('not-an-email')).toBe(0);
  });

  test('1.1.4 a magic link works only once', async ({ page }) => {
    const email = uniqueEmail('user');
    await gotoHydrated(page, '/sign-in');
    const link = await requestMagicLink(page, email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/platform/);

    await page.context().clearCookies();
    await page.goto(link);

    await expect(page).toHaveURL(/\/sign-in/);
    expect((await page.request.get('/api/me/organizations')).status()).toBe(
      401
    );
  });

  test('1.1.5 a tampered link fails', async ({ page }) => {
    await gotoHydrated(page, '/sign-in');
    const link = await requestMagicLink(page, uniqueEmail('user'));

    await page.goto(link.replace(/token=([^&]{4})/, 'token=XXXX'));

    await expect(page).toHaveURL(/\/sign-in/);
    expect((await page.request.get('/api/me/organizations')).status()).toBe(
      401
    );
  });

  test('1.1.6 return to the page you came from', async ({ page }) => {
    await page.goto('/platform/contacts');
    await expect(page).toHaveURL('/sign-in?redirectTo=/platform/contacts');

    await page.waitForFunction(
      () => (document.querySelector('#__nuxt') as any)?.__vue_app__
    );
    await page.goto(await requestMagicLink(page, uniqueEmail('user')));

    await expect(page).toHaveURL('/platform/contacts');
  });

  test('1.1.7 external redirects are ignored', async ({ page }) => {
    await gotoHydrated(page, '/sign-in?redirectTo=https://example.com');
    await page.goto(await requestMagicLink(page, uniqueEmail('user')));

    await expect(page).toHaveURL(/localhost:3100\/platform/);
  });

  test('1.1.8 signed-in users skip the sign-in page', async ({ page }) => {
    await signIn(page, uniqueEmail('user'));

    await page.goto('/sign-in');

    await expect(page).toHaveURL(/\/platform/);
  });
});

test.describe('Part 1.2: Signing out', () => {
  test('1.2.1 log out', async ({ page }) => {
    const email = uniqueEmail('user');
    await signIn(page, email);

    await page.getByRole('button', { name: email.split('@')[0] }).click();
    await page.getByRole('menuitem', { name: 'Log out' }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/platform');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe('Part 1.3: Access boundaries', () => {
  test('1.3.1 signed-out visitors', async ({ page }) => {
    await page.goto('/platform');
    await expect(page).toHaveURL('/sign-in?redirectTo=/platform');

    await page.goto('/thakhin');
    await expect(page).toHaveURL('/sign-in?redirectTo=/thakhin');

    expect((await page.request.get('/api/me/organizations')).status()).toBe(
      401
    );
    expect((await page.request.get('/api/admin/overview')).status()).toBe(404);
  });

  test('1.3.2 non-admin user', async ({ page }) => {
    await signIn(page, uniqueEmail('user'));

    await page.goto('/thakhin');

    await expect(page).toHaveURL(/\/platform/);
    expect((await page.request.get('/api/admin/overview')).status()).toBe(404);
  });

  test('1.3.3 platform admin', async ({ page }) => {
    const email = uniqueEmail('admin');
    await signIn(page, email);
    await makePlatformAdmin(email);

    await page.goto('/thakhin');

    await expect(page).toHaveURL('/thakhin');
    expect((await page.request.get('/api/admin/overview')).status()).toBe(200);
  });
});
