-- ============================================================================
-- admin_alerts: ephemeral lifecycle
--
-- Additive, safe to run on top of 20260909000000_relational_complete.sql.
-- 1) Allow ADMINS to DELETE admin alerts (their app dismiss removes it at once).
-- 2) Provide a cleanup helper that purges alerts past their expiresAt TTL.
--    (TTL itself needs no schema: it lives in adata extra->>'expiresAt',
--    a BIGINT epoch-ms written by the client; the reader filters on it.)
-- ============================================================================

DROP POLICY IF EXISTS "rel_admin_del_alerts" ON public.admin_alerts;

CREATE POLICY "rel_admin_del_alerts"
    ON public.admin_alerts FOR DELETE
    USING (public.is_admin_user());

-- Purge alerts whose TTL (extra.expiresAt, epoch ms) already passed.
CREATE OR REPLACE FUNCTION public.purge_expired_admin_alerts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.admin_alerts
    WHERE (extra->>'expiresAt') IS NOT NULL
      AND (extra->>'expiresAt') ~ '^[0-9]+$'
      AND (extra->>'expiresAt')::bigint < (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
$$;

-- Remove any alerts that were never given a TTL (legacy rows/fallback) so the
-- "latest alert" can never be a permanently stuck one.
DELETE FROM public.admin_alerts
WHERE (extra->>'expiresAt') IS NULL OR (extra->>'expiresAt') = '';