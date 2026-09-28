-- Restore the exact definitions supplied on 2026-09-28. Does not change grants.
BEGIN;
CREATE OR REPLACE FUNCTION public.dashboard_breakdowns(p_start_date date, p_end_date date, p_attribution_model text DEFAULT 'last'::text, p_limit integer DEFAULT 20)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_model text :=

    LOWER(

      COALESCE(

        p_attribution_model,

        'last'

      )

    );



  v_limit integer :=

    GREATEST(

      1,

      LEAST(

        COALESCE(p_limit, 20),

        100

      )

    );



  v_result jsonb;



BEGIN



  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  WITH base AS (



    SELECT



      d.id,

      d.lead_id,

      d.visitor_id,

      d.clicked_at,





      /* =====================================

         CANAL FINAL

         ===================================== */



      CASE

        WHEN v_model = 'first'

          THEN d.first_channel_final

        ELSE d.last_channel_final

      END AS channel,





      /* =====================================

         CONFIANÇA

         ===================================== */



      CASE

        WHEN v_model = 'first'

          THEN d.first_attribution_confidence

        ELSE d.last_attribution_confidence

      END AS confidence,





      /* =====================================

         SOURCE

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(

            CASE

              WHEN v_model = 'first'

                THEN d.first_source_effective

              ELSE d.last_source_effective

            END

          ),

          ''

        ),

        'No identificado'

      ) AS source,





      /* =====================================

         MEDIUM

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(

            CASE

              WHEN v_model = 'first'

                THEN d.first_medium_effective

              ELSE d.last_medium_effective

            END

          ),

          ''

        ),

        'No identificado'

      ) AS medium,





      /* =====================================

         CAMPANHA

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(

            CASE

              WHEN v_model = 'first'

                THEN d.first_campaign_effective

              ELSE d.last_campaign_effective

            END

          ),

          ''

        ),

        'Sin campaña'

      ) AS campaign,





      /* =====================================

         ANÚNCIO / CRIATIVO

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(

            CASE

              WHEN v_model = 'first'

                THEN d.first_content_effective

              ELSE d.last_content_effective

            END

          ),

          ''

        ),

        'Sin anuncio / creativo'

      ) AS creative,





      /* =====================================

         KEYWORD

         ===================================== */



      CASE

        WHEN v_model = 'first'

          THEN d.first_keyword_safe

        ELSE d.last_keyword_safe

      END AS keyword,





      /* =====================================

         LANDING PAGE SEMÂNTICA

         ===================================== */



      CASE

        WHEN v_model = 'first'

          THEN d.first_landing_semantic

        ELSE d.last_landing_semantic

      END AS landing_page,





      /* =====================================

         QUALIDADE DA LANDING

         ===================================== */



      CASE

        WHEN v_model = 'first'

          THEN d.first_landing_quality

        ELSE d.last_landing_quality

      END AS landing_quality,





      /* =====================================

         PÁGINA DO CLIQUE

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(d.page_url_clean),

          ''

        ),

        'No identificada'

      ) AS click_page,





      /* =====================================

         BOTÃO

         ===================================== */



      COALESCE(

        NULLIF(

          BTRIM(d.click_text_normalized),

          ''

        ),

        'No identificado'

      ) AS button,





      /* =====================================

         IDs TÉCNICOS

         ===================================== */



      d.meta_campaign_id,

      d.meta_adset_id,

      d.meta_ad_id,

      d.meta_adset_name,

      d.meta_source,

      d.placement,



      d.google_campaign_id,

      d.google_adgroup_id,

      d.google_ad_id,

      d.google_target_id,

      d.matchtype_normalized,

      d.network_normalized,

      d.device_normalized



    FROM

      public.vw_whatsapp_leads_keywords_safe d



    WHERE

      d.is_valid_click = true



      AND d.is_test_record = false



      AND d.clicked_at >= (

        p_start_date::timestamp

        AT TIME ZONE 'America/Santiago'

      )



      AND d.clicked_at < (

        (p_end_date + 1)::timestamp

        AT TIME ZONE 'America/Santiago'

      )



  ),





  channels AS (



    SELECT

      channel,

      COUNT(*) AS contacts



    FROM base



    GROUP BY channel



  ),





  confidence AS (



    SELECT

      confidence,

      COUNT(*) AS contacts



    FROM base



    GROUP BY confidence



  ),





  sources AS (



    SELECT

      channel,

      source,

      COUNT(*) AS contacts



    FROM base



    GROUP BY

      channel,

      source



  ),





  mediums AS (



    SELECT

      channel,

      medium,

      COUNT(*) AS contacts



    FROM base



    GROUP BY

      channel,

      medium



  ),





  campaigns AS (



    SELECT

      channel,

      campaign,

      confidence,

      COUNT(*) AS contacts



    FROM base



    GROUP BY

      channel,

      campaign,

      confidence



  ),





  creatives AS (



    SELECT

      channel,

      campaign,

      creative,

      COUNT(*) AS contacts



    FROM base



    GROUP BY

      channel,

      campaign,

      creative



  ),





  keywords AS (



    SELECT

      channel,

      campaign,

      keyword,

      COUNT(*) AS contacts



    FROM base



    WHERE

      keyword IS NOT NULL

      AND BTRIM(keyword) <> ''



    GROUP BY

      channel,

      campaign,

      keyword



  ),





  landing_pages AS (



    SELECT

      landing_page,

      landing_quality,

      COUNT(*) AS contacts



    FROM base



    GROUP BY

      landing_page,

      landing_quality



  ),





  click_pages AS (



    SELECT

      click_page,

      COUNT(*) AS contacts



    FROM base



    GROUP BY click_page



  ),





  buttons AS (



    SELECT

      button,

      COUNT(*) AS contacts



    FROM base



    GROUP BY button



  ),





  devices AS (



    SELECT

      device_normalized AS device,

      COUNT(*) AS contacts



    FROM base



    WHERE

      device_normalized IS NOT NULL



    GROUP BY

      device_normalized



  ),





  networks AS (



    SELECT

      network_normalized AS network,

      COUNT(*) AS contacts



    FROM base



    WHERE

      network_normalized IS NOT NULL



    GROUP BY

      network_normalized



  ),





  matchtypes AS (



    SELECT

      matchtype_normalized AS matchtype,

      COUNT(*) AS contacts



    FROM base



    WHERE

      matchtype_normalized IS NOT NULL



    GROUP BY

      matchtype_normalized



  ),





  meta_breakdown AS (



    SELECT

      COALESCE(

        NULLIF(BTRIM(meta_source), ''),

        'No identificado'

      ) AS source,



      COALESCE(

        NULLIF(BTRIM(placement), ''),

        'No identificado'

      ) AS placement,



      COUNT(*) AS contacts



    FROM base



    WHERE

      channel = 'Meta Ads'



    GROUP BY

      COALESCE(

        NULLIF(BTRIM(meta_source), ''),

        'No identificado'

      ),

      COALESCE(

        NULLIF(BTRIM(placement), ''),

        'No identificado'

      )



  )





  SELECT



    jsonb_build_object(





      /* =====================================

         META

         ===================================== */



      'meta',



      jsonb_build_object(



        'timezone',

        'America/Santiago',



        'start_date',

        p_start_date,



        'end_date',

        p_end_date,



        'attribution_model',

        v_model,



        'valid_clicks',

        (

          SELECT COUNT(*)

          FROM base

        )



      ),





      /* =====================================

         CANAIS

         ===================================== */



      'channels',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'contacts',

              x.contacts

            )

            ORDER BY

              x.contacts DESC,

              x.channel

          )



          FROM (

            SELECT *

            FROM channels

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         CONFIANÇA DA ATRIBUIÇÃO

         ===================================== */



      'attribution_confidence',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'confidence',

              x.confidence,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM confidence x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         SOURCES

         ===================================== */



      'sources',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'source',

              x.source,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM sources

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         MEDIUMS

         ===================================== */



      'mediums',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'medium',

              x.medium,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM mediums

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         CAMPANHAS

         ===================================== */



      'campaigns',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'campaign',

              x.campaign,

              'confidence',

              x.confidence,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM campaigns

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         CRIATIVOS

         ===================================== */



      'creatives',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'campaign',

              x.campaign,

              'creative',

              x.creative,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM creatives

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         KEYWORDS

         ===================================== */



      'keywords',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'channel',

              x.channel,

              'campaign',

              x.campaign,

              'keyword',

              x.keyword,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM keywords

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         LANDING PAGES

         ===================================== */



      'landing_pages',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'page',

              x.landing_page,

              'quality',

              x.landing_quality,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM landing_pages

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         CLICK PAGES

         ===================================== */



      'click_pages',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'page',

              x.click_page,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM click_pages

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         BOTÕES

         ===================================== */



      'buttons',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'button',

              x.button,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM buttons

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         DISPOSITIVOS

         ===================================== */



      'devices',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'device',

              x.device,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM devices x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         NETWORK GOOGLE

         ===================================== */



      'networks',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'network',

              x.network,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM networks x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         MATCH TYPES

         ===================================== */



      'matchtypes',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'matchtype',

              x.matchtype,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM matchtypes x

        ),

        '[]'::jsonb

      ),





      /* =====================================

         META PLACEMENTS

         ===================================== */



      'meta_placements',



      COALESCE(

        (

          SELECT jsonb_agg(

            jsonb_build_object(

              'source',

              x.source,

              'placement',

              x.placement,

              'contacts',

              x.contacts

            )

            ORDER BY x.contacts DESC

          )



          FROM (

            SELECT *

            FROM meta_breakdown

            ORDER BY contacts DESC

            LIMIT v_limit

          ) x

        ),

        '[]'::jsonb

      )



    )



  INTO v_result;





  RETURN v_result;



END;



$function$

;
CREATE OR REPLACE FUNCTION public.dashboard_snapshot(p_preset text DEFAULT '7d'::text, p_attribution_model text DEFAULT 'last'::text, p_custom_start date DEFAULT NULL::date, p_custom_end date DEFAULT NULL::date, p_limit integer DEFAULT 20)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_model text :=

    LOWER(

      TRIM(

        COALESCE(

          p_attribution_model,

          'last'

        )

      )

    );



  v_limit integer :=

    GREATEST(

      1,

      LEAST(

        COALESCE(p_limit, 20),

        100

      )

    );



  v_period jsonb;



  v_start_date date;

  v_end_date date;



  v_kpis jsonb;

  v_breakdowns jsonb;

  v_campaigns jsonb;

  v_timeseries jsonb;

  v_comparisons jsonb;



  v_kpi_contacts bigint;

  v_breakdown_contacts bigint;

  v_timeseries_contacts bigint;

  v_campaign_contacts bigint;



  v_result jsonb;



BEGIN



  /* =========================================

     VALIDA MODELO DE ATRIBUIÇÃO

     ========================================= */



  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  /* =========================================

     RESOLVE O PERÍODO

     ========================================= */



  v_period :=

    public.dashboard_resolve_period(

      p_preset,

      p_custom_start,

      p_custom_end

    );





  v_start_date :=

    (v_period ->> 'start_date')::date;





  v_end_date :=

    (v_period ->> 'end_date')::date;





  /* =========================================

     KPIs

     ========================================= */



  v_kpis :=

    public.dashboard_kpis(

      v_start_date,

      v_end_date,

      v_model

    );





  /* =========================================

     BREAKDOWNS

     ========================================= */



  v_breakdowns :=

    public.dashboard_breakdowns(

      v_start_date,

      v_end_date,

      v_model,

      v_limit

    );





  /* =========================================

     CAMPANHAS

     ========================================= */



  v_campaigns :=

    public.dashboard_campaigns(

      v_start_date,

      v_end_date,

      v_model,

      v_limit

    );





  /* =========================================

     SÉRIE TEMPORAL

     ========================================= */



  v_timeseries :=

    public.dashboard_timeseries(

      v_start_date,

      v_end_date,

      v_model

    );





  /* =========================================

     COMPARAÇÕES

     ========================================= */



  v_comparisons :=

    public.dashboard_comparisons(

      v_start_date,

      v_end_date,

      v_model

    );





  /* =========================================

     VALORES PARA CHECK DE INTEGRIDADE

     ========================================= */



  v_kpi_contacts :=

    COALESCE(

      (

        v_kpis

        -> 'current'

        ->> 'valid_clicks'

      )::bigint,

      0

    );





  v_breakdown_contacts :=

    COALESCE(

      (

        v_breakdowns

        -> 'meta'

        ->> 'valid_clicks'

      )::bigint,

      0

    );





  v_timeseries_contacts :=

    COALESCE(

      (

        v_timeseries

        -> 'totals'

        ->> 'current_contacts'

      )::bigint,

      0

    );





  v_campaign_contacts :=

    COALESCE(

      (

        v_campaigns

        ->> 'total_campaign_contacts'

      )::bigint,

      0

    );





  /* =========================================

     SNAPSHOT FINAL

     ========================================= */



  v_result :=

    jsonb_build_object(





      /* =====================================

         VERSÃO DO CONTRATO

         ===================================== */



      'schema_version',

      '1.0',





      /* =====================================

         REQUEST

         ===================================== */



      'request',



      jsonb_build_object(



        'preset',

        p_preset,



        'attribution_model',

        v_model,



        'custom_start',

        p_custom_start,



        'custom_end',

        p_custom_end,



        'limit',

        v_limit



      ),





      /* =====================================

         PERÍODO RESOLVIDO

         ===================================== */



      'period',

      v_period,





      /* =====================================

         PRINCIPAIS BLOCOS

         ===================================== */



      'kpis',

      v_kpis,



      'breakdowns',

      v_breakdowns,



      'campaigns',

      v_campaigns,



      'timeseries',

      v_timeseries,



      'comparisons',

      v_comparisons,





      /* =====================================

         CONTROLE DE INTEGRIDADE



         Isso será muito útil para detectar

         divergências sem depender do frontend.

         ===================================== */



      'integrity',



      jsonb_build_object(



        'kpi_valid_clicks',

        v_kpi_contacts,



        'breakdown_valid_clicks',

        v_breakdown_contacts,



        'timeseries_valid_clicks',

        v_timeseries_contacts,



        'campaign_contacts',

        v_campaign_contacts,





        /*

         * KPIs, breakdowns e timeseries

         * precisam obrigatoriamente bater.

         */



        'core_totals_match',



        (

          v_kpi_contacts =

          v_breakdown_contacts



          AND



          v_kpi_contacts =

          v_timeseries_contacts

        ),





        /*

         * Campanha não precisa bater com

         * valid_clicks porque tráfego direto,

         * orgânico etc. pode não ter campanha.

         */



        'campaign_coverage_rate',



        CASE



          WHEN v_kpi_contacts = 0 THEN

            0



          ELSE

            ROUND(

              (

                v_campaign_contacts::numeric

                /

                v_kpi_contacts::numeric

              ) * 100,

              2

            )



        END



      )



    );





  RETURN v_result;



END;



$function$

;
COMMIT;
