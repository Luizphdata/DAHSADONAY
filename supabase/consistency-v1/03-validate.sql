-- Read-only: run before and after in a test copy; save both results.
BEGIN READ ONLY;
WITH samples(preset, model) AS (
 VALUES ('ayer','first'),('ayer','last'),('7d','first'),('7d','last'),('30d','last')
), results AS (
 SELECT preset,model,public.dashboard_snapshot(preset,model,NULL,NULL,1) AS data FROM samples
)
SELECT preset,model,data->>'schema_version' AS version,
 data->'period' AS period,
 data#>>'{kpis,current,valid_clicks}' AS contacts,
 data#>>'{kpis,period,previous_available}' AS previous_available,
 data#>'{kpis,change}' AS changes,data->'integrity' AS integrity,
 (SELECT SUM((item->>'contacts')::bigint) FROM jsonb_array_elements(data#>'{breakdowns,channels}') item) AS channel_sum,
 jsonb_array_length(data#>'{breakdowns,channels}') AS channel_count,
 jsonb_array_length(data#>'{campaigns,campaigns}') AS campaign_count
FROM results;
SELECT p.oid::regprocedure AS function,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS backend
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('dashboard_snapshot','dashboard_breakdowns');
COMMIT;
