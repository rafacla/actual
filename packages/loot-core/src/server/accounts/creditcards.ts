import * as db from '../db';

/* eslint-disable import/no-unused-modules */
export async function createCreditCard(account_id) {
  // Check to make sure no payee already exists with exactly the same
  // name
  let row = await db.first(
    `SELECT id FROM creditcards WHERE UNICODE_LOWER(account_id) = ? AND tombstone = 0`,
    [account_id],
  );

  if (row) {
    return row.id;
  } else {
    return db.insertCreditCard({ account_id: account_id });
  }
}
