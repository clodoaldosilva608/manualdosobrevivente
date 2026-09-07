CREATE TABLE public.checklist_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_state TO authenticated;
GRANT ALL ON public.checklist_state TO service_role;
ALTER TABLE public.checklist_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_select_own ON public.checklist_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY cs_insert_own ON public.checklist_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY cs_update_own ON public.checklist_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY cs_delete_own ON public.checklist_state FOR DELETE TO authenticated USING (auth.uid() = user_id);