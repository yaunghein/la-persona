import { getTableName, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { env } from '../../env';
import { db } from '../db';
import {
  card,
  cardRequest,
  communitySetting,
  event,
  organization,
  subscriptionPayment,
  user,
} from '../db/schema';

/**
 * One-off: some image columns stored full bucket URLs. The database stores
 * object keys only, so this strips the bucket host from existing rows.
 */

// Same hosts as `objectStorageHosts`, which bun can't import (`~~` alias).
const hosts = [
  `${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`,
  `${env.AWS_BUCKET_NAME}.s3.amazonaws.com`,
]
  .map((host) => host.replaceAll('.', '\\.'))
  .join('|');
const prefix = `^https://(${hosts})/`;

const columns: [PgTable, PgColumn][] = [
  [communitySetting, communitySetting.coverUrl],
  [communitySetting, communitySetting.wallpaperUrl],
  [communitySetting, communitySetting.cardBackUrl],
  [communitySetting, communitySetting.emailQrBackgroundUrl],
  [communitySetting, communitySetting.emailContactExchangeUrl],
  [communitySetting, communitySetting.emailAfterEventUrl],
  [organization, organization.logo],
  [event, event.coverUrl],
  [card, card.avatarUrl],
  [card, card.wallpaperUrl],
  [card, card.cardBackUrl],
  [user, user.image],
  [subscriptionPayment, subscriptionPayment.receiptUrl],
  [cardRequest, cardRequest.paymentReceiptUrl],
];

async function main() {
  const updated: Record<string, number> = {};
  for (const [table, column] of columns) {
    // The schema uses `casing: 'snake_case'`, so `column.name` is the property name.
    const columnName = column.name.replace(
      /[A-Z]/g,
      (c) => `_${c.toLowerCase()}`
    );
    const name = sql.identifier(columnName);
    const result = await db.execute(
      sql`update ${table} set ${name} = regexp_replace(${name}, ${prefix}, '') where ${name} ~ ${prefix}`
    );
    updated[`${getTableName(table)}.${columnName}`] = result.rowCount ?? 0;
  }

  const photos = await db
    .update(event)
    .set({
      photoUrls: sql`(
        select coalesce(jsonb_agg(regexp_replace(url, ${prefix}, '')), '[]'::jsonb)
        from jsonb_array_elements_text(${event.photoUrls}) as url
      )`,
    })
    .where(sql`${event.photoUrls}::text ~ ${`"https://(${hosts})/`}`)
    .returning({ id: event.id });
  updated['event.photo_urls'] = photos.length;

  console.log('[backfill-media-keys]', updated);
}

main();
