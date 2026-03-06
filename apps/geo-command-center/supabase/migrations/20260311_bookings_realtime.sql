-- Enable Supabase Realtime for bookings so the Tasks & Workflow calendar
-- updates automatically when businesses schedule meetings via Book a Call.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END
$$;
