CREATE TABLE public.app_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  units text NOT NULL DEFAULT 'metric' CHECK (units IN ('metric', 'nautical')),
  coord_format text NOT NULL DEFAULT 'DD' CHECK (coord_format IN ('DD', 'DMS', 'MGRS')),
  north_ref text NOT NULL DEFAULT 'true' CHECK (north_ref IN ('true', 'magnetic')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_preferences TO authenticated;
GRANT ALL ON public.app_preferences TO service_role;
ALTER TABLE public.app_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preferences_select_own" ON public.app_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "preferences_insert_own" ON public.app_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_update_own" ON public.app_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "preferences_delete_own" ON public.app_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER app_preferences_touch BEFORE UPDATE ON public.app_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.weekly_report_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  weekday smallint NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 0 AND 6),
  local_time time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  recipient_email text NOT NULL,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_report_settings TO authenticated;
GRANT ALL ON public.weekly_report_settings TO service_role;
ALTER TABLE public.weekly_report_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_reports_select_own" ON public.weekly_report_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "weekly_reports_insert_own" ON public.weekly_report_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_reports_update_own" ON public.weekly_report_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_reports_delete_own" ON public.weekly_report_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER weekly_report_settings_touch BEFORE UPDATE ON public.weekly_report_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.report_delivery_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  waypoint_count integer NOT NULL DEFAULT 0,
  gear_count integer NOT NULL DEFAULT 0,
  checklist_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.report_delivery_history TO authenticated;
GRANT ALL ON public.report_delivery_history TO service_role;
ALTER TABLE public.report_delivery_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_history_select_own" ON public.report_delivery_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX report_delivery_history_user_sent_idx ON public.report_delivery_history(user_id, sent_at DESC);