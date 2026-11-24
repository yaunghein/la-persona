import { expect, type Page } from '@playwright/test';
import pg from 'pg';
import { readMagicLink } from './mailpit';

export function uniqueEmail(label: string) {
  return `${label}-${crypto.randomUUID().slice(0, 8)}@test.local`;
}

/** Clicks on server-rendered HTML do nothing until Vue has hydrated it. */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(
    () => (document.querySelector('#__nuxt') as any)?.__vue_app__
  );
}

export async function requestMagicLink(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send Magic Link' }).click();
  await expect(page.getByText('Check your inbox').first()).toBeVisible();
  return readMagicLink(email);
}

export async function signIn(page: Page, email: string) {
  await gotoHydrated(page, '/sign-in');
  await page.goto(await requestMagicLink(page, email));
  await expect(page).toHaveURL(/\/platform/);
}

export async function makePlatformAdmin(email: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`update "user" set role = 'admin' where email = $1`, [
      email,
    ]);
  } finally {
    await client.end();
  }
}
