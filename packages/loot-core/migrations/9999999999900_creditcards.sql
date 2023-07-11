BEGIN TRANSACTION;

CREATE TABLE creditcards
  (id TEXT PRIMARY KEY,
   account_id TEXT,
   processor_name TEXT,
   statement_closing_day INTEGER,
   payment_due_day INTEGER,
   credit_limit INTEGER,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE creditcards_holders
  (id TEXT PRIMARY KEY,
   name TEXT,
   media_kind INTEGER DEFAULT 0,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE creditcards_statements
  (id TEXT PRIMARY KEY,
   credit_card_id TEXT,
   closing_date INTEGER,
   payment_due_date INTEGER,
   status INTEGER DEFAULT 0,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE creditcards_statements_transactions
  (id TEXT PRIMARY KEY,
   creditcard_statement_id TEXT,
   transaction_id TEXT,
   creditcard_holder_id TEXT,
   tombstone INTEGER DEFAULT 0);


COMMIT;
