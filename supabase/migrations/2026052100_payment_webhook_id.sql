-- Add webhook confirmation marker used by the Razorpay webhook-first upgrade flow.
-- The webhook writes this column after Razorpay confirms payment settlement; the
-- client-side tRPC mutation only reads it to report whether confirmation landed.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS webhook_payment_id text;

CREATE INDEX IF NOT EXISTS idx_trips_webhook_payment_id
  ON public.trips(webhook_payment_id)
  WHERE webhook_payment_id IS NOT NULL;

COMMENT ON COLUMN public.trips.webhook_payment_id IS
  'Authoritative Razorpay webhook payment/subscription reference. Set by /api/payments/webhook before the client upgrade confirmation gate succeeds.';
