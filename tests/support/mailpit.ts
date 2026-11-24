const MAILPIT_URL = 'http://localhost:8025';

export async function readMagicLink(email: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}" subject:"magic sign-in link"`)}`
    ).then((response) => response.json());
    const newest = search.messages?.[0];
    if (newest) {
      const message = await fetch(
        `${MAILPIT_URL}/api/v1/message/${newest.ID}`
      ).then((response) => response.json());
      const link = message.HTML.match(
        /href="([^"]*\/api\/auth\/magic-link\/verify[^"]*)"/
      )?.[1];
      if (!link) throw new Error(`No magic link in the email to ${email}`);
      return link.replaceAll('&amp;', '&');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No magic-link email reached ${email} within 15s`);
}

export async function countEmails(email: string) {
  const search = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`
  ).then((response) => response.json());
  return search.messages_count as number;
}
