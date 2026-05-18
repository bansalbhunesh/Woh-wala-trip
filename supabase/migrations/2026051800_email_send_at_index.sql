-- Partial index on scheduled_emails(send_at) filtered to unsent rows.
-- The anniversary cron queries: WHERE sent_at IS NULL AND send_at BETWEEN $start AND $end
-- Without this index the query does a full table scan, which degrades as email volume grows.

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_send_at
  ON public.scheduled_emails(send_at)
  WHERE sent_at IS NULL;
