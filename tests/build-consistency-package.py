"""Rebuild the reviewed SQL package from the user's exported function definitions."""
import csv, re, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
rows = list(csv.DictReader(source.open(encoding='utf-8-sig', newline='')))
functions = {r['assinatura']: r['codigo'] for r in rows}
out = root / 'supabase' / 'consistency-v1'
out.mkdir(parents=True, exist_ok=True)
def compact(sql):
    return re.sub(r'\s+', ' ', re.sub(r'/\*[\s\S]*?\*/', '', sql)).strip()
def replace_once(s, old, new):
    assert s.count(old) == 1, (old, s.count(old))
    return s.replace(old, new, 1)
break_sig='dashboard_breakdowns(date,date,text,integer)'
snap_sig='dashboard_snapshot(text,text,date,date,integer)'
b = compact(functions[break_sig])
b = replace_once(b, "AND d.clicked_at < ( (p_end_date + 1)::timestamp AT TIME ZONE 'America/Santiago' )", "AND d.clicked_at < LEAST(NOW(), (p_end_date + 1)::timestamp AT TIME ZONE 'America/Santiago')")
b = replace_once(b, 'SELECT * FROM channels ORDER BY contacts DESC LIMIT v_limit', 'SELECT * FROM channels ORDER BY contacts DESC, channel')
s = compact(functions[snap_sig])
s = replace_once(s, 'v_result jsonb;', 'v_result jsonb; v_count jsonb; v_channel_sum bigint; v_daily_sum bigint; v_previous_available boolean;')
guard = """
IF jsonb_typeof(v_kpis->'current') IS DISTINCT FROM 'object'
 OR jsonb_typeof(v_kpis->'previous') IS DISTINCT FROM 'object'
 OR jsonb_typeof(v_kpis->'change') IS DISTINCT FROM 'object'
 OR jsonb_typeof(v_breakdowns->'channels') IS DISTINCT FROM 'array'
 OR jsonb_typeof(v_timeseries->'comparison') IS DISTINCT FROM 'array'
 OR jsonb_typeof(v_timeseries->'channels') IS DISTINCT FROM 'array'
 OR jsonb_typeof(v_campaigns->'campaigns') IS DISTINCT FROM 'array'
 OR jsonb_typeof(v_comparisons #> '{comparisons,previous_period,available}') NOT IN ('boolean','null')
 OR v_comparisons #> '{comparisons,previous_period,available}' IS NULL THEN
 RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Incomplete dashboard snapshot';
END IF;
FOR v_count IN
 SELECT value FROM jsonb_array_elements(jsonb_build_array(
 v_kpis #> '{current,valid_clicks}', v_breakdowns #> '{meta,valid_clicks}',
 v_timeseries #> '{totals,current_contacts}', v_campaigns->'total_campaign_contacts'))
 UNION ALL SELECT item->'contacts' FROM jsonb_array_elements(v_breakdowns->'channels') item
 UNION ALL SELECT item->'current_contacts' FROM jsonb_array_elements(v_timeseries->'comparison') item
LOOP
 IF jsonb_typeof(v_count) IS DISTINCT FROM 'number' OR (v_count #>> '{}') !~ '^[0-9]+$' THEN
  RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Missing or invalid dashboard count';
 END IF;
END LOOP;
SELECT COALESCE(SUM((item->>'contacts')::bigint),0) INTO v_channel_sum
 FROM jsonb_array_elements(v_breakdowns->'channels') item;
SELECT COALESCE(SUM((item->>'current_contacts')::bigint),0) INTO v_daily_sum
 FROM jsonb_array_elements(v_timeseries->'comparison') item;
v_previous_available := COALESCE((v_comparisons #>> '{comparisons,previous_period,available}')::boolean,false);
v_kpis := jsonb_set(v_kpis, '{period,previous_available}', to_jsonb(v_previous_available));
v_timeseries := jsonb_set(v_timeseries, '{meta,previous_available}', to_jsonb(v_previous_available));
IF NOT v_previous_available THEN
 v_kpis := jsonb_set(v_kpis, '{change}', jsonb_build_object('valid_clicks_pct',NULL,'google_ads_pct',NULL,'meta_ads_pct',NULL,'organic_pct',NULL));
 v_timeseries := jsonb_set(v_timeseries, '{totals,change_pct}', 'null'::jsonb);
 v_timeseries := jsonb_set(v_timeseries, '{comparison}',
  (SELECT COALESCE(jsonb_agg(jsonb_set(item, '{change_pct}', 'null'::jsonb) ORDER BY ordinal),'[]'::jsonb)
   FROM jsonb_array_elements(v_timeseries->'comparison') WITH ORDINALITY AS t(item,ordinal)));
END IF;
"""
s = replace_once(s, 'v_kpi_contacts :=', guard+' v_kpi_contacts :=')
s = replace_once(s, "'1.0'", "'1.1'")
s = replace_once(s, 'v_kpi_contacts = v_timeseries_contacts )', 'v_kpi_contacts = v_timeseries_contacts AND v_kpi_contacts = v_channel_sum AND v_kpi_contacts = v_daily_sum )')
header='-- Package 1: no changes to event rows, attribution views or grants.\nBEGIN;\n'
preflight="""DO $$ BEGIN
 IF NOT has_function_privilege('service_role','public.dashboard_snapshot(text,text,date,date,integer)','EXECUTE')
 OR has_function_privilege('anon','public.dashboard_snapshot(text,text,date,date,integer)','EXECUTE')
 OR has_function_privilege('authenticated','public.dashboard_snapshot(text,text,date,date,integer)','EXECUTE') THEN
 RAISE EXCEPTION 'Unexpected snapshot permissions: stop and review'; END IF;
END $$;
"""
(out/'01-apply.sql').write_text(header+preflight+b+';\n\n'+s+';\nCOMMIT;\n',encoding='utf-8')
(out/'02-rollback.sql').write_text('-- Restore the exact definitions supplied on 2026-09-28. Does not change grants.\nBEGIN;\n'+functions[break_sig]+';\n'+functions[snap_sig]+';\nCOMMIT;\n',encoding='utf-8')
(out/'baseline-functions.sql').write_text('\n\n'.join(r['codigo']+';' for r in rows),encoding='utf-8')
print('Generated apply, rollback and baseline SQL from',len(rows),'exported functions.')
