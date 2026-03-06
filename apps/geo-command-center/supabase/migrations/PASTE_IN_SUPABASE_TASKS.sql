-- ============================================
-- 1. HELPER (skip if you already have update_updated_at_column from another migration)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. TASKS & WORKFLOW
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('citations','gmb','reviews','content','technical','ai_visibility','other')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','blocked','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_client_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_agency ON tasks(agency_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_location ON tasks(location_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_agency_status ON tasks(agency_id, status);

CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_agency ON task_comments(agency_id);

CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_activity_task ON task_activity(task_id);
CREATE INDEX idx_task_activity_agency ON task_activity(agency_id);
CREATE INDEX idx_task_activity_created ON task_activity(created_at DESC);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage tasks"
  ON tasks FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read visible tasks"
  ON tasks FOR SELECT
  USING (
    is_client_visible = TRUE
    AND client_id = get_user_client_id()
  );

CREATE POLICY "Agency members manage task_comments"
  ON task_comments FOR ALL
  USING (agency_id = get_user_agency_id() AND is_agency_member())
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Clients read task_comments for visible tasks"
  ON task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE is_client_visible = TRUE AND client_id = get_user_client_id()
    )
  );

CREATE POLICY "Agency members read task_activity"
  ON task_activity FOR SELECT
  USING (agency_id = get_user_agency_id() AND is_agency_member());

CREATE POLICY "Agency members insert task_activity"
  ON task_activity FOR INSERT
  WITH CHECK (agency_id = get_user_agency_id() AND is_agency_member());
