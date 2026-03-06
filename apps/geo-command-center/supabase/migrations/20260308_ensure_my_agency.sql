-- Ensure my-agency exists for leads funnel (AGS_LEADS_AGENCY_SLUG default)
INSERT INTO agencies (name, slug)
VALUES ('My Agency', 'my-agency')
ON CONFLICT (slug) DO NOTHING;
