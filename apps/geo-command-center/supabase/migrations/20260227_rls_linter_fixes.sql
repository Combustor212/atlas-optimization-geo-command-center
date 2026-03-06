-- RLS linter fixes: auth_rls_initplan + multiple_permissive_policies
-- 1. Use (SELECT auth.uid()) in profiles policy to avoid per-row re-evaluation
-- 2. Consolidate multiple permissive SELECT policies into one per table

-- ============================================
-- 1. PROFILES: Auth RLS initplan fix
-- ============================================
DROP POLICY IF EXISTS "Profiles own or agency" ON public.profiles;
CREATE POLICY "Profiles own or agency"
  ON public.profiles FOR ALL
  USING (id = (SELECT auth.uid()) OR agency_id = get_user_agency_id());

-- ============================================
-- 2. ATTRIBUTION_RULES: Remove redundant read policy (FOR ALL already grants SELECT)
-- ============================================
DROP POLICY IF EXISTS "Agency members read attribution_rules" ON public.attribution_rules;

-- ============================================
-- 3. TABLES WITH TWO SELECT POLICIES: Merge into one + split agency FOR ALL into I/U/D
-- ============================================

-- ----- ai_mentions -----
CREATE POLICY "ai_mentions_select_agency_or_client"
  ON public.ai_mentions FOR SELECT
  USING (
    agency_id = get_user_agency_id()
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view ai_mentions for their locations" ON public.ai_mentions;
DROP POLICY IF EXISTS "Agency members can manage ai_mentions" ON public.ai_mentions;
CREATE POLICY "ai_mentions_agency_insert" ON public.ai_mentions FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "ai_mentions_agency_update" ON public.ai_mentions FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "ai_mentions_agency_delete" ON public.ai_mentions FOR DELETE USING (agency_id = get_user_agency_id());

-- ----- citation_audits -----
CREATE POLICY "citation_audits_select_agency_or_client"
  ON public.citation_audits FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read citation_audits for their locations" ON public.citation_audits;
DROP POLICY IF EXISTS "Agency members manage citation_audits" ON public.citation_audits;
CREATE POLICY "citation_audits_agency_insert" ON public.citation_audits FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "citation_audits_agency_update" ON public.citation_audits FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "citation_audits_agency_delete" ON public.citation_audits FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- citations -----
CREATE POLICY "citations_select_agency_or_client"
  ON public.citations FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read citations for their locations" ON public.citations;
DROP POLICY IF EXISTS "Agency members manage citations" ON public.citations;
CREATE POLICY "citations_agency_insert" ON public.citations FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "citations_agency_update" ON public.citations FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "citations_agency_delete" ON public.citations FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- clients -----
CREATE POLICY "clients_select_agency_or_own"
  ON public.clients FOR SELECT
  USING (agency_id = get_user_agency_id() OR id = get_user_client_id());
DROP POLICY IF EXISTS "Clients see own record" ON public.clients;
DROP POLICY IF EXISTS "Agency members see agency clients" ON public.clients;
DROP POLICY IF EXISTS "Agency admins manage clients" ON public.clients;
CREATE POLICY "clients_agency_insert" ON public.clients FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "clients_agency_update" ON public.clients FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "clients_agency_delete" ON public.clients FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- competitor_rank_snapshots -----
CREATE POLICY "competitor_rank_snapshots_select_agency_or_client"
  ON public.competitor_rank_snapshots FOR SELECT
  USING (
    agency_id = get_user_agency_id()
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view rank snapshots for their locations" ON public.competitor_rank_snapshots;
DROP POLICY IF EXISTS "Agency members can manage rank snapshots" ON public.competitor_rank_snapshots;
CREATE POLICY "competitor_rank_snapshots_agency_insert" ON public.competitor_rank_snapshots FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "competitor_rank_snapshots_agency_update" ON public.competitor_rank_snapshots FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "competitor_rank_snapshots_agency_delete" ON public.competitor_rank_snapshots FOR DELETE USING (agency_id = get_user_agency_id());

-- ----- competitor_review_snapshots -----
CREATE POLICY "competitor_review_snapshots_select_agency_or_client"
  ON public.competitor_review_snapshots FOR SELECT
  USING (
    agency_id = get_user_agency_id()
    OR competitor_id IN (
      SELECT c.id FROM competitors c
      JOIN locations l ON c.location_id = l.id
      WHERE l.client_id = get_user_client_id()
    )
  );
DROP POLICY IF EXISTS "Clients can view review snapshots for their competitors" ON public.competitor_review_snapshots;
DROP POLICY IF EXISTS "Agency members can manage review snapshots" ON public.competitor_review_snapshots;
CREATE POLICY "competitor_review_snapshots_agency_insert" ON public.competitor_review_snapshots FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "competitor_review_snapshots_agency_update" ON public.competitor_review_snapshots FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "competitor_review_snapshots_agency_delete" ON public.competitor_review_snapshots FOR DELETE USING (agency_id = get_user_agency_id());

-- ----- competitors -----
CREATE POLICY "competitors_select_agency_or_client"
  ON public.competitors FOR SELECT
  USING (
    agency_id = get_user_agency_id()
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view competitors for their locations" ON public.competitors;
DROP POLICY IF EXISTS "Agency members can manage competitors" ON public.competitors;
CREATE POLICY "competitors_agency_insert" ON public.competitors FOR INSERT WITH CHECK (agency_id = get_user_agency_id());
CREATE POLICY "competitors_agency_update" ON public.competitors FOR UPDATE USING (agency_id = get_user_agency_id());
CREATE POLICY "competitors_agency_delete" ON public.competitors FOR DELETE USING (agency_id = get_user_agency_id());

-- ----- generative_ai_visibility (only two SELECT policies; INSERT/UPDATE already separate) -----
CREATE POLICY "generative_ai_visibility_select_agency_or_client"
  ON public.generative_ai_visibility FOR SELECT
  USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id())
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view AI visibility for their locations" ON public.generative_ai_visibility;
DROP POLICY IF EXISTS "Agency members can view AI visibility for their locations" ON public.generative_ai_visibility;

-- ----- health_scores -----
CREATE POLICY "health_scores_select_agency_or_client"
  ON public.health_scores FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR client_id = get_user_client_id()
  );
DROP POLICY IF EXISTS "Clients read own health scores" ON public.health_scores;
DROP POLICY IF EXISTS "Agency members manage health scores" ON public.health_scores;
CREATE POLICY "health_scores_agency_insert" ON public.health_scores FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "health_scores_agency_update" ON public.health_scores FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "health_scores_agency_delete" ON public.health_scores FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- lead_attributions -----
CREATE POLICY "lead_attributions_select_agency_or_client"
  ON public.lead_attributions FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR lead_event_id IN (
      SELECT id FROM lead_events
      WHERE location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
    )
  );
DROP POLICY IF EXISTS "Clients read lead_attributions for their locations" ON public.lead_attributions;
DROP POLICY IF EXISTS "Agency members manage lead_attributions" ON public.lead_attributions;
CREATE POLICY "lead_attributions_agency_insert" ON public.lead_attributions FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "lead_attributions_agency_update" ON public.lead_attributions FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "lead_attributions_agency_delete" ON public.lead_attributions FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- lead_events -----
CREATE POLICY "lead_events_select_agency_or_client"
  ON public.lead_events FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read lead_events for their locations" ON public.lead_events;
DROP POLICY IF EXISTS "Agency members manage lead_events" ON public.lead_events;
CREATE POLICY "lead_events_agency_insert" ON public.lead_events FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "lead_events_agency_update" ON public.lead_events FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "lead_events_agency_delete" ON public.lead_events FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- locations -----
CREATE POLICY "locations_select_agency_or_client"
  ON public.locations FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id())
    OR client_id = get_user_client_id()
  );
DROP POLICY IF EXISTS "Clients see own locations" ON public.locations;
DROP POLICY IF EXISTS "Agency members see client locations" ON public.locations;
DROP POLICY IF EXISTS "Agency manages locations" ON public.locations;
CREATE POLICY "locations_agency_insert" ON public.locations FOR INSERT WITH CHECK (client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id()) AND is_agency_member());
CREATE POLICY "locations_agency_update" ON public.locations FOR UPDATE USING (client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id()) AND is_agency_member());
CREATE POLICY "locations_agency_delete" ON public.locations FOR DELETE USING (client_id IN (SELECT id FROM clients WHERE agency_id = get_user_agency_id()) AND is_agency_member());

-- ----- nap_profiles -----
CREATE POLICY "nap_profiles_select_agency_or_client"
  ON public.nap_profiles FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR location_id IN (SELECT id FROM locations WHERE client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read nap_profiles for their locations" ON public.nap_profiles;
DROP POLICY IF EXISTS "Agency members manage nap_profiles" ON public.nap_profiles;
CREATE POLICY "nap_profiles_agency_insert" ON public.nap_profiles FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "nap_profiles_agency_update" ON public.nap_profiles FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "nap_profiles_agency_delete" ON public.nap_profiles FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- recommendation_events -----
CREATE POLICY "recommendation_events_select_agency_or_client"
  ON public.recommendation_events FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR recommendation_id IN (
      SELECT r.id FROM recommendations r
      JOIN locations l ON r.location_id = l.id
      WHERE l.client_id = get_user_client_id()
    )
  );
DROP POLICY IF EXISTS "Clients can view recommendation events for their locations" ON public.recommendation_events;
DROP POLICY IF EXISTS "Agency members can manage recommendation events" ON public.recommendation_events;
CREATE POLICY "recommendation_events_agency_insert" ON public.recommendation_events FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "recommendation_events_agency_update" ON public.recommendation_events FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "recommendation_events_agency_delete" ON public.recommendation_events FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- recommendations -----
CREATE POLICY "recommendations_select_agency_or_client"
  ON public.recommendations FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view recommendations for their locations" ON public.recommendations;
DROP POLICY IF EXISTS "Agency members can manage recommendations" ON public.recommendations;
CREATE POLICY "recommendations_agency_insert" ON public.recommendations FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "recommendations_agency_update" ON public.recommendations FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "recommendations_agency_delete" ON public.recommendations FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- report_runs -----
CREATE POLICY "report_runs_select_agency_or_client"
  ON public.report_runs FOR SELECT
  USING ((agency_id = get_user_agency_id() AND is_agency_member()) OR client_id = get_user_client_id());
DROP POLICY IF EXISTS "report_runs_client_read" ON public.report_runs;
DROP POLICY IF EXISTS "report_runs_agency_manage" ON public.report_runs;
CREATE POLICY "report_runs_agency_insert" ON public.report_runs FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "report_runs_agency_update" ON public.report_runs FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "report_runs_agency_delete" ON public.report_runs FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- search_visibility (only two SELECT policies; INSERT/UPDATE already separate) -----
CREATE POLICY "search_visibility_select_agency_or_client"
  ON public.search_visibility FOR SELECT
  USING (
    location_id IN (SELECT l.id FROM locations l JOIN clients c ON l.client_id = c.id WHERE c.agency_id = get_user_agency_id())
    OR location_id IN (SELECT l.id FROM locations l WHERE l.client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients can view search visibility for their locations" ON public.search_visibility;
DROP POLICY IF EXISTS "Agency members can view search visibility for their locations" ON public.search_visibility;

-- ----- task_comments -----
CREATE POLICY "task_comments_select_agency_or_client"
  ON public.task_comments FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR task_id IN (SELECT id FROM tasks WHERE is_client_visible = TRUE AND client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read task_comments for visible tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Agency members manage task_comments" ON public.task_comments;
CREATE POLICY "task_comments_agency_insert" ON public.task_comments FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "task_comments_agency_update" ON public.task_comments FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "task_comments_agency_delete" ON public.task_comments FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());

-- ----- tasks -----
CREATE POLICY "tasks_select_agency_or_client"
  ON public.tasks FOR SELECT
  USING (
    (agency_id = get_user_agency_id() AND is_agency_member())
    OR (is_client_visible = TRUE AND client_id = get_user_client_id())
  );
DROP POLICY IF EXISTS "Clients read visible tasks" ON public.tasks;
DROP POLICY IF EXISTS "Agency members manage tasks" ON public.tasks;
CREATE POLICY "tasks_agency_insert" ON public.tasks FOR INSERT WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "tasks_agency_update" ON public.tasks FOR UPDATE USING (agency_id = get_user_agency_id() AND is_agency_member());
CREATE POLICY "tasks_agency_delete" ON public.tasks FOR DELETE USING (agency_id = get_user_agency_id() AND is_agency_member());
