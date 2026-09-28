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

CREATE OR REPLACE FUNCTION public.dashboard_campaigns(p_start_date date, p_end_date date, p_attribution_model text DEFAULT 'last'::text, p_limit integer DEFAULT 50)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text :=

    'America/Santiago';



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

        COALESCE(p_limit, 50),

        200

      )

    );



  v_today date :=

    (

      NOW()

      AT TIME ZONE 'America/Santiago'

    )::date;



  v_current_start timestamptz;

  v_current_end timestamptz;



  v_result jsonb;



BEGIN



  /* =========================================

     VALIDAÇÕES

     ========================================= */



  IF p_start_date IS NULL

     OR p_end_date IS NULL THEN



    RAISE EXCEPTION

      'p_start_date e p_end_date são obrigatórios';



  END IF;





  IF p_end_date < p_start_date THEN



    RAISE EXCEPTION

      'p_end_date não pode ser menor que p_start_date';



  END IF;





  IF p_end_date > v_today THEN



    RAISE EXCEPTION

      'p_end_date não pode estar no futuro em America/Santiago';



  END IF;





  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  /* =========================================

     JANELA ATUAL

     ========================================= */



  v_current_start :=

    (

      p_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  IF p_end_date = v_today THEN



    v_current_end := NOW();



  ELSE



    v_current_end :=

      (

        (p_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  WITH base AS (



    SELECT



      CASE

        WHEN v_model = 'first'

          THEN d.first_channel_final

        ELSE d.last_channel_final

      END AS channel,





      NULLIF(

        BTRIM(

          CASE

            WHEN v_model = 'first'

              THEN d.first_campaign_effective

            ELSE d.last_campaign_effective

          END

        ),

        ''

      ) AS campaign,





      CASE

        WHEN v_model = 'first'

          THEN d.first_attribution_confidence

        ELSE d.last_attribution_confidence

      END AS confidence





    FROM

      public.vw_whatsapp_leads_final d





    WHERE



      d.is_valid_click = true



      AND d.is_test_record = false



      AND d.clicked_at >=

          v_current_start



      AND d.clicked_at <

          v_current_end



  ),





  /* =========================================

     AGREGA UMA VEZ POR CAMPANHA

     ========================================= */



  campaigns AS (



    SELECT



      channel,



      campaign,



      COUNT(*)::bigint

        AS contacts,





      COUNT(*) FILTER (

        WHERE confidence = 'Confirmada'

      )::bigint

        AS confirmed_contacts,





      COUNT(*) FILTER (

        WHERE confidence =

              'Confirmada por referencia'

      )::bigint

        AS reference_confirmed_contacts,





      COUNT(*) FILTER (

        WHERE confidence =

              'Inferida histórica'

      )::bigint

        AS inferred_contacts,





      COUNT(*) FILTER (

        WHERE confidence = 'Legacy'

      )::bigint

        AS legacy_contacts,





      COUNT(*) FILTER (

        WHERE confidence =

              'No identificada'

      )::bigint

        AS unidentified_contacts





    FROM base





    WHERE

      campaign IS NOT NULL





    GROUP BY

      channel,

      campaign



  ),





  /* =========================================

     TOTAL DE CONTATOS COM CAMPANHA

     ========================================= */



  totals AS (



    SELECT

      COALESCE(

        SUM(contacts),

        0

      )::bigint AS contacts



    FROM campaigns



  )





  SELECT



    jsonb_build_object(





      'meta',



      jsonb_build_object(



        'timezone',

        v_timezone,



        'start_date',

        p_start_date,



        'end_date',

        p_end_date,



        'attribution_model',

        v_model,



        'generated_at',

        NOW(),



        'is_partial_period',

        (

          p_end_date = v_today

        )



      ),





      'total_campaign_contacts',



      (

        SELECT contacts

        FROM totals

      ),





      'campaigns',



      COALESCE(



        (



          SELECT



            jsonb_agg(



              jsonb_build_object(



                'channel',

                x.channel,



                'campaign',

                x.campaign,



                'contacts',

                x.contacts,





                'share_pct',



                CASE



                  WHEN t.contacts = 0

                    THEN 0



                  ELSE ROUND(

                    (

                      x.contacts::numeric

                      /

                      t.contacts::numeric

                    ) * 100,

                    2

                  )



                END,





                'confidence',



                jsonb_build_object(



                  'confirmed',

                  x.confirmed_contacts,



                  'confirmed_by_referrer',

                  x.reference_confirmed_contacts,



                  'inferred_historical',

                  x.inferred_contacts,



                  'legacy',

                  x.legacy_contacts,



                  'unidentified',

                  x.unidentified_contacts



                )



              )



              ORDER BY

                x.contacts DESC,

                x.campaign



            )



          FROM (



            SELECT *

            FROM campaigns



            ORDER BY

              contacts DESC,

              campaign



            LIMIT v_limit



          ) x



          CROSS JOIN totals t



        ),



        '[]'::jsonb



      )



    )



  INTO v_result;





  RETURN v_result;



END;



$function$

;

CREATE OR REPLACE FUNCTION public.dashboard_comparisons(p_start_date date, p_end_date date, p_attribution_model text DEFAULT 'last'::text)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text :=

    'America/Santiago';



  v_model text :=

    LOWER(

      COALESCE(

        p_attribution_model,

        'last'

      )

    );



  v_now timestamptz :=

    NOW();



  v_now_local timestamp :=

    NOW()

    AT TIME ZONE 'America/Santiago';



  v_today date :=

    (

      NOW()

      AT TIME ZONE 'America/Santiago'

    )::date;



  v_days integer;



  v_is_partial boolean;



  /* CURRENT */



  v_current_start_date date;

  v_current_end_date date;



  v_current_start timestamptz;

  v_current_end timestamptz;





  /* PREVIOUS PERIOD */



  v_pp_start_date date;

  v_pp_end_date date;



  v_pp_start timestamptz;

  v_pp_end timestamptz;





  /* PREVIOUS MONTH */



  v_pm_start_date date;

  v_pm_end_date date;



  v_pm_start timestamptz;

  v_pm_end timestamptz;





  /* PREVIOUS YEAR */



  v_py_start_date date;

  v_py_end_date date;



  v_py_start timestamptz;

  v_py_end timestamptz;





  /* DATASET */



  v_first_data_date date;

  v_last_data_date date;





  v_result jsonb;



BEGIN



  /* =========================================

     VALIDAÇÕES

     ========================================= */



  IF p_start_date IS NULL

     OR p_end_date IS NULL THEN



    RAISE EXCEPTION

      'p_start_date e p_end_date são obrigatórios';



  END IF;





  IF p_end_date < p_start_date THEN



    RAISE EXCEPTION

      'p_end_date não pode ser menor que p_start_date';



  END IF;





  IF p_end_date > v_today THEN



    RAISE EXCEPTION

      'p_end_date não pode estar no futuro em America/Santiago';



  END IF;





  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  /* =========================================

     INFORMAÇÕES DO DATASET

     ========================================= */



  SELECT



    MIN(

      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date

    ),



    MAX(

      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date

    )



  INTO

    v_first_data_date,

    v_last_data_date



  FROM public.vw_whatsapp_leads_final d



  WHERE

    d.is_valid_click = true

    AND d.is_test_record = false;





  /* =========================================

     CURRENT

     ========================================= */



  v_current_start_date :=

    p_start_date;



  v_current_end_date :=

    p_end_date;





  v_days :=

    (

      p_end_date -

      p_start_date +

      1

    )::integer;





  v_is_partial :=

    (

      p_end_date = v_today

    );





  v_current_start :=

    (

      p_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  IF v_is_partial THEN



    v_current_end :=

      v_now;



  ELSE



    v_current_end :=

      (

        (p_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  /* =========================================

     PREVIOUS PERIOD

     ========================================= */



  v_pp_start_date :=

    p_start_date - v_days;



  v_pp_end_date :=

    p_start_date - 1;





  v_pp_start :=

    (

      v_pp_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  IF v_is_partial THEN



    v_pp_end :=

      (

        (

          v_pp_end_date +

          v_now_local::time

        )

        AT TIME ZONE v_timezone

      );



  ELSE



    v_pp_end :=

      (

        (v_pp_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  /* =========================================

     PREVIOUS MONTH

     ========================================= */



  v_pm_start_date :=

    (

      p_start_date -

      INTERVAL '1 month'

    )::date;





  v_pm_end_date :=

    (

      p_end_date -

      INTERVAL '1 month'

    )::date;





  v_pm_start :=

    (

      v_pm_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  IF v_is_partial THEN



    v_pm_end :=

      (

        (

          v_pm_end_date +

          v_now_local::time

        )

        AT TIME ZONE v_timezone

      );



  ELSE



    v_pm_end :=

      (

        (v_pm_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  /* =========================================

     PREVIOUS YEAR

     ========================================= */



  v_py_start_date :=

    (

      p_start_date -

      INTERVAL '1 year'

    )::date;





  v_py_end_date :=

    (

      p_end_date -

      INTERVAL '1 year'

    )::date;





  v_py_start :=

    (

      v_py_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  IF v_is_partial THEN



    v_py_end :=

      (

        (

          v_py_end_date +

          v_now_local::time

        )

        AT TIME ZONE v_timezone

      );



  ELSE



    v_py_end :=

      (

        (v_py_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  /* =========================================

     CONSULTA

     ========================================= */



  WITH periods AS (



    SELECT

      'current'::text AS period,

      v_current_start_date AS start_date,

      v_current_end_date AS end_date,

      v_current_start AS start_at,

      v_current_end AS end_at



    UNION ALL



    SELECT

      'previous_period',

      v_pp_start_date,

      v_pp_end_date,

      v_pp_start,

      v_pp_end



    UNION ALL



    SELECT

      'previous_month',

      v_pm_start_date,

      v_pm_end_date,

      v_pm_start,

      v_pm_end



    UNION ALL



    SELECT

      'previous_year',

      v_py_start_date,

      v_py_end_date,

      v_py_start,

      v_py_end



  ),





  metrics AS (



    SELECT



      p.period,

      p.start_date,

      p.end_date,





      COUNT(d.id) FILTER (

        WHERE d.is_valid_click

      )::bigint AS contacts,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND (

            CASE

              WHEN v_model = 'first'

                THEN d.first_channel_final

              ELSE d.last_channel_final

            END

          ) = 'Google Ads'



      )::bigint AS google_ads,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND (

            CASE

              WHEN v_model = 'first'

                THEN d.first_channel_final

              ELSE d.last_channel_final

            END

          ) = 'Meta Ads'



      )::bigint AS meta_ads,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND (

            CASE

              WHEN v_model = 'first'

                THEN d.first_channel_final

              ELSE d.last_channel_final

            END

          ) IN (

            'Google orgánico',

            'Instagram orgánico',

            'Facebook orgánico'

          )



      )::bigint AS organic,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND (

            CASE

              WHEN v_model = 'first'

                THEN d.first_channel_final

              ELSE d.last_channel_final

            END

          ) = 'Directo'



      )::bigint AS direct,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND (

            CASE

              WHEN v_model = 'first'

                THEN d.first_channel_final

              ELSE d.last_channel_final

            END

          ) = 'Referencia'



      )::bigint AS referral





    FROM periods p





    LEFT JOIN public.vw_whatsapp_leads_final d



      ON d.clicked_at >= p.start_at



      AND d.clicked_at < p.end_at



      AND d.is_test_record = false





    GROUP BY

      p.period,

      p.start_date,

      p.end_date



  ),





  current_metrics AS (



    SELECT *

    FROM metrics

    WHERE period = 'current'



  ),





  comparisons AS (



    SELECT *



    FROM metrics



    WHERE period <> 'current'



  )





  SELECT



    jsonb_build_object(





      /* =====================================

         META

         ===================================== */



      'meta',



      jsonb_build_object(



        'timezone',

        v_timezone,



        'attribution_model',

        v_model,



        'generated_at',

        v_now,



        'is_partial_period',

        v_is_partial,



        'cutoff_local_time',



        CASE



          WHEN v_is_partial

            THEN TO_CHAR(

              v_now_local,

              'HH24:MI:SS'

            )



          ELSE NULL



        END



      ),





      /* =====================================

         COBERTURA DO BANCO

         ===================================== */



      'data_coverage',



      jsonb_build_object(



        'first_available_date',

        v_first_data_date,



        'last_available_date',

        v_last_data_date



      ),





      /* =====================================

         CURRENT

         ===================================== */



      'current',



      (



        SELECT



          jsonb_build_object(



            'start_date',

            c.start_date,



            'end_date',

            c.end_date,



            'contacts',

            c.contacts,



            'google_ads',

            c.google_ads,



            'meta_ads',

            c.meta_ads,



            'organic',

            c.organic,



            'direct',

            c.direct,



            'referral',

            c.referral



          )



        FROM current_metrics c



      ),





      /* =====================================

         COMPARAÇÕES

         ===================================== */



      'comparisons',



      (



        SELECT



          COALESCE(



            jsonb_object_agg(



              x.period,



              jsonb_build_object(



                'start_date',

                x.start_date,



                'end_date',

                x.end_date,





                /*

                 * Só consideramos o período

                 * historicamente disponível

                 * quando o banco já possuía

                 * dados no início dele.

                 */



                'available',



                (

                  v_first_data_date

                  <= x.start_date

                ),





                'contacts',



                CASE



                  WHEN

                    v_first_data_date

                    <= x.start_date



                  THEN x.contacts



                  ELSE NULL



                END,





                'google_ads',



                CASE

                  WHEN v_first_data_date <= x.start_date

                    THEN x.google_ads

                  ELSE NULL

                END,





                'meta_ads',



                CASE

                  WHEN v_first_data_date <= x.start_date

                    THEN x.meta_ads

                  ELSE NULL

                END,





                'organic',



                CASE

                  WHEN v_first_data_date <= x.start_date

                    THEN x.organic

                  ELSE NULL

                END,





                'direct',



                CASE

                  WHEN v_first_data_date <= x.start_date

                    THEN x.direct

                  ELSE NULL

                END,





                'referral',



                CASE

                  WHEN v_first_data_date <= x.start_date

                    THEN x.referral

                  ELSE NULL

                END,





                /* CURRENT VS COMPARADOR */



                'contacts_change_pct',



                CASE



                  WHEN

                    v_first_data_date

                    > x.start_date



                  THEN NULL





                  WHEN

                    x.contacts = 0



                  THEN NULL





                  ELSE ROUND(



                    (

                      (

                        c.contacts -

                        x.contacts

                      )::numeric

                      /

                      x.contacts::numeric

                    ) * 100,



                    2



                  )



                END,





                'google_ads_change_pct',



                CASE



                  WHEN

                    v_first_data_date

                    > x.start_date



                    OR x.google_ads = 0



                  THEN NULL



                  ELSE ROUND(



                    (

                      (

                        c.google_ads -

                        x.google_ads

                      )::numeric

                      /

                      x.google_ads::numeric

                    ) * 100,



                    2



                  )



                END,





                'meta_ads_change_pct',



                CASE



                  WHEN

                    v_first_data_date

                    > x.start_date



                    OR x.meta_ads = 0



                  THEN NULL



                  ELSE ROUND(



                    (

                      (

                        c.meta_ads -

                        x.meta_ads

                      )::numeric

                      /

                      x.meta_ads::numeric

                    ) * 100,



                    2



                  )



                END



              )



            ),



            '{}'::jsonb



          )





        FROM comparisons x



        CROSS JOIN current_metrics c



      )



    )



  INTO v_result;





  RETURN v_result;



END;



$function$

;

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_start_date date, p_end_date date)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text := 'America/Santiago';



  v_now timestamptz := NOW();



  v_now_local timestamp :=

    NOW() AT TIME ZONE 'America/Santiago';



  v_today_local date :=

    (

      NOW() AT TIME ZONE 'America/Santiago'

    )::date;



  v_days integer;



  v_previous_start date;

  v_previous_end date;



  v_current_start timestamptz;

  v_current_end timestamptz;



  v_previous_start_ts timestamptz;

  v_previous_end_ts timestamptz;



  v_is_partial boolean := false;



  v_result jsonb;



BEGIN



  /* =========================================

     VALIDAÇÕES

     ========================================= */



  IF p_start_date IS NULL

     OR p_end_date IS NULL THEN



    RAISE EXCEPTION

      'p_start_date e p_end_date são obrigatórios';



  END IF;





  IF p_end_date < p_start_date THEN



    RAISE EXCEPTION

      'p_end_date não pode ser menor que p_start_date';



  END IF;





  IF p_end_date > v_today_local THEN



    RAISE EXCEPTION

      'p_end_date não pode estar no futuro em America/Santiago';



  END IF;





  /* =========================================

     PERÍODOS

     ========================================= */



  v_days :=

    (

      p_end_date -

      p_start_date +

      1

    )::integer;





  v_previous_start :=

    p_start_date - v_days;





  v_previous_end :=

    p_start_date - 1;





  v_current_start :=

    (

      p_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  v_previous_start_ts :=

    (

      v_previous_start::timestamp

      AT TIME ZONE v_timezone

    );





  /* =========================================

     SE TERMINA HOJE:

     corta no horário atual.

     ========================================= */



  IF p_end_date = v_today_local THEN



    v_is_partial := true;



    v_current_end :=

      v_now;



    /*

     * Mesmo horário local no último

     * dia do período anterior.

     */



    v_previous_end_ts :=

      (

        (

          v_previous_end

          + v_now_local::time

        )

        AT TIME ZONE v_timezone

      );





  ELSE



    v_is_partial := false;



    /*

     * Período fechado:

     * inclui p_end_date inteiro.

     */



    v_current_end :=

      (

        (p_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );





    /*

     * Período anterior inteiro.

     */



    v_previous_end_ts :=

      (

        p_start_date::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  WITH periods AS (



    SELECT

      'current'::text AS period,

      v_current_start AS start_at,

      v_current_end AS end_at



    UNION ALL



    SELECT

      'previous'::text,

      v_previous_start_ts,

      v_previous_end_ts



  ),





  metrics AS (



    SELECT



      p.period,





      /* EVENTOS BRUTOS NÃO-TESTE */



      COUNT(d.id) AS raw_events,





      /* CLIQUES VÁLIDOS */



      COUNT(d.id) FILTER (

        WHERE d.is_valid_click

      ) AS valid_clicks,





      /* DUPLICADOS */



      COUNT(d.id) FILTER (

        WHERE d.is_technical_duplicate

      ) AS technical_duplicates,





      /* VISITANTES ÚNICOS IDENTIFICADOS */



      COUNT(

        DISTINCT d.visitor_id

      ) FILTER (



        WHERE

          d.is_valid_click



          AND NULLIF(

            BTRIM(d.visitor_id),

            ''

          ) IS NOT NULL



      ) AS unique_visitors,





      /* CLIQUES COM VISITOR */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND NULLIF(

            BTRIM(d.visitor_id),

            ''

          ) IS NOT NULL



      ) AS identified_visitor_clicks,





      /* ATRIBUÍDOS */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final

              <> 'No identificado'



      ) AS attributed_clicks,





      /* ATRIBUIÇÃO CONFIRMADA */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_attribution_confidence

              IN (

                'Confirmada',

                'Confirmada por referencia'

              )



      ) AS confirmed_attribution_clicks,





      /* ATRIBUIÇÃO INFERIDA */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_attribution_confidence

              = 'Inferida histórica'



      ) AS inferred_attribution_clicks,





      /* LEGACY */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_attribution_confidence

              = 'Legacy'



      ) AS legacy_attribution_clicks,





      /* GOOGLE ADS */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final

              = 'Google Ads'



      ) AS google_ads_clicks,





      /* META ADS */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final

              = 'Meta Ads'



      ) AS meta_ads_clicks,





      /* ORGÂNICO */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final IN (

            'Google orgánico',

            'Instagram orgánico',

            'Facebook orgánico'

          )



      ) AS organic_clicks,





      /* DIRETO */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final

              = 'Directo'



      ) AS direct_clicks,





      /* REFERÊNCIA */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click



          AND d.last_channel_final

              = 'Referencia'



      ) AS referral_clicks





    FROM periods p





    LEFT JOIN public.vw_whatsapp_leads_final d



      ON d.clicked_at >= p.start_at



      AND d.clicked_at < p.end_at



      AND d.is_test_record = false





    GROUP BY p.period



  ),





  current_metrics AS (



    SELECT *

    FROM metrics

    WHERE period = 'current'



  ),





  previous_metrics AS (



    SELECT *

    FROM metrics

    WHERE period = 'previous'



  )





  SELECT



    jsonb_build_object(





      /* =====================================

         PERÍODO

         ===================================== */



      'period',



      jsonb_build_object(



        'timezone',

        v_timezone,



        'start_date',

        p_start_date,



        'end_date',

        p_end_date,



        'days',

        v_days,



        'previous_start_date',

        v_previous_start,



        'previous_end_date',

        v_previous_end,



        'is_partial_period',

        v_is_partial,



        'cutoff_local_time',



        CASE

          WHEN v_is_partial

            THEN TO_CHAR(

              v_now_local,

              'HH24:MI:SS'

            )

          ELSE NULL

        END,



        'generated_at',

        v_now



      ),





      /* =====================================

         ATUAL

         ===================================== */



      'current',



      jsonb_build_object(



        'raw_events',

        c.raw_events,



        'valid_clicks',

        c.valid_clicks,



        'technical_duplicates',

        c.technical_duplicates,



        'unique_visitors',

        c.unique_visitors,



        'identified_visitor_clicks',

        c.identified_visitor_clicks,





        'visitor_id_coverage_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.identified_visitor_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'attributed_clicks',

        c.attributed_clicks,



        'confirmed_attribution_clicks',

        c.confirmed_attribution_clicks,



        'inferred_attribution_clicks',

        c.inferred_attribution_clicks,



        'legacy_attribution_clicks',

        c.legacy_attribution_clicks,





        'attribution_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.attributed_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'confirmed_attribution_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.confirmed_attribution_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'duplicate_rate',



        CASE



          WHEN c.raw_events = 0

            THEN 0



          ELSE ROUND(

            (

              c.technical_duplicates::numeric

              /

              c.raw_events::numeric

            ) * 100,

            2

          )



        END,





        'google_ads_clicks',

        c.google_ads_clicks,



        'meta_ads_clicks',

        c.meta_ads_clicks,



        'organic_clicks',

        c.organic_clicks,



        'direct_clicks',

        c.direct_clicks,



        'referral_clicks',

        c.referral_clicks



      ),





      /* =====================================

         ANTERIOR

         ===================================== */



      'previous',



      jsonb_build_object(



        'raw_events',

        prev.raw_events,



        'valid_clicks',

        prev.valid_clicks,



        'technical_duplicates',

        prev.technical_duplicates,



        'unique_visitors',

        prev.unique_visitors,



        'identified_visitor_clicks',

        prev.identified_visitor_clicks,





        'visitor_id_coverage_rate',



        CASE



          WHEN prev.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              prev.identified_visitor_clicks::numeric

              /

              prev.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'attributed_clicks',

        prev.attributed_clicks,



        'confirmed_attribution_clicks',

        prev.confirmed_attribution_clicks,



        'inferred_attribution_clicks',

        prev.inferred_attribution_clicks,



        'legacy_attribution_clicks',

        prev.legacy_attribution_clicks,



        'google_ads_clicks',

        prev.google_ads_clicks,



        'meta_ads_clicks',

        prev.meta_ads_clicks,



        'organic_clicks',

        prev.organic_clicks,



        'direct_clicks',

        prev.direct_clicks,



        'referral_clicks',

        prev.referral_clicks



      ),





      /* =====================================

         VARIAÇÃO

         ===================================== */



      'change',



      jsonb_build_object(





        'valid_clicks_pct',



        CASE



          WHEN prev.valid_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.valid_clicks -

                prev.valid_clicks

              )::numeric

              /

              prev.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'google_ads_pct',



        CASE



          WHEN prev.google_ads_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.google_ads_clicks -

                prev.google_ads_clicks

              )::numeric

              /

              prev.google_ads_clicks::numeric

            ) * 100,

            2

          )



        END,





        'meta_ads_pct',



        CASE



          WHEN prev.meta_ads_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.meta_ads_clicks -

                prev.meta_ads_clicks

              )::numeric

              /

              prev.meta_ads_clicks::numeric

            ) * 100,

            2

          )



        END,





        'organic_pct',



        CASE



          WHEN prev.organic_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.organic_clicks -

                prev.organic_clicks

              )::numeric

              /

              prev.organic_clicks::numeric

            ) * 100,

            2

          )



        END



      )



    )



  INTO v_result





  FROM current_metrics c

  CROSS JOIN previous_metrics prev;





  RETURN v_result;



END;



$function$

;

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_start_date date, p_end_date date, p_attribution_model text)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text :=

    'America/Santiago';



  v_model text :=

    LOWER(

      COALESCE(

        p_attribution_model,

        'last'

      )

    );



  v_now timestamptz :=

    NOW();



  v_now_local timestamp :=

    NOW()

    AT TIME ZONE 'America/Santiago';



  v_today_local date :=

    (

      NOW()

      AT TIME ZONE 'America/Santiago'

    )::date;



  v_days integer;



  v_previous_start date;

  v_previous_end date;



  v_current_start timestamptz;

  v_current_end timestamptz;



  v_previous_start_ts timestamptz;

  v_previous_end_ts timestamptz;



  v_is_partial boolean :=

    false;



  v_result jsonb;



BEGIN



  /* =========================================

     VALIDAÇÕES

     ========================================= */



  IF p_start_date IS NULL

     OR p_end_date IS NULL THEN



    RAISE EXCEPTION

      'p_start_date e p_end_date são obrigatórios';



  END IF;





  IF p_end_date < p_start_date THEN



    RAISE EXCEPTION

      'p_end_date não pode ser menor que p_start_date';



  END IF;





  IF p_end_date > v_today_local THEN



    RAISE EXCEPTION

      'p_end_date não pode estar no futuro em America/Santiago';



  END IF;





  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  /* =========================================

     DATAS

     ========================================= */



  v_days :=

    (

      p_end_date -

      p_start_date +

      1

    )::integer;





  v_previous_start :=

    p_start_date - v_days;



  v_previous_end :=

    p_start_date - 1;





  v_current_start :=

    (

      p_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  v_previous_start_ts :=

    (

      v_previous_start::timestamp

      AT TIME ZONE v_timezone

    );





  /* =========================================

     CORTE DE PERÍODO

     ========================================= */



  IF p_end_date = v_today_local THEN



    v_is_partial := true;



    v_current_end :=

      v_now;





    v_previous_end_ts :=

      (

        (

          v_previous_end

          + v_now_local::time

        )

        AT TIME ZONE v_timezone

      );





  ELSE



    v_current_end :=

      (

        (p_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );





    v_previous_end_ts :=

      (

        p_start_date::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  WITH periods AS (



    SELECT



      'current'::text AS period,



      v_current_start

        AS start_at,



      v_current_end

        AS end_at





    UNION ALL





    SELECT



      'previous'::text,



      v_previous_start_ts,



      v_previous_end_ts



  ),





  metrics AS (



    SELECT



      p.period,





      /* =====================================

         EVENTOS

         ===================================== */



      COUNT(d.id)::bigint

        AS raw_events,





      COUNT(d.id) FILTER (

        WHERE d.is_valid_click = true

      )::bigint

        AS valid_clicks,





      COUNT(d.id) FILTER (

        WHERE d.is_technical_duplicate = true

      )::bigint

        AS technical_duplicates,





      /* =====================================

         VISITOR ID

         ===================================== */



      COUNT(

        DISTINCT d.visitor_id

      ) FILTER (



        WHERE

          d.is_valid_click = true



          AND NULLIF(

            BTRIM(d.visitor_id),

            ''

          ) IS NOT NULL



      )::bigint

        AS unique_visitors,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND NULLIF(

            BTRIM(d.visitor_id),

            ''

          ) IS NOT NULL



      )::bigint

        AS identified_visitor_clicks,





      /* =====================================

         ATRIBUIÇÃO

         ===================================== */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel

              <> 'No identificado'



      )::bigint

        AS attributed_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.confidence IN (

            'Confirmada',

            'Confirmada por referencia'

          )



      )::bigint

        AS confirmed_attribution_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.confidence =

              'Inferida histórica'



      )::bigint

        AS inferred_attribution_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.confidence =

              'Legacy'



      )::bigint

        AS legacy_attribution_clicks,





      /* =====================================

         CANAIS

         ===================================== */



      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel =

              'Google Ads'



      )::bigint

        AS google_ads_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel =

              'Meta Ads'



      )::bigint

        AS meta_ads_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel IN (

            'Google orgánico',

            'Instagram orgánico',

            'Facebook orgánico'

          )



      )::bigint

        AS organic_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel =

              'Directo'



      )::bigint

        AS direct_clicks,





      COUNT(d.id) FILTER (



        WHERE

          d.is_valid_click = true



          AND a.channel =

              'Referencia'



      )::bigint

        AS referral_clicks





    FROM periods p





    LEFT JOIN public.vw_whatsapp_leads_final d



      ON d.clicked_at >= p.start_at



      AND d.clicked_at < p.end_at



      AND d.is_test_record = false





    LEFT JOIN LATERAL (



      SELECT



        CASE



          WHEN v_model = 'first'

            THEN d.first_channel_final



          ELSE d.last_channel_final



        END AS channel,





        CASE



          WHEN v_model = 'first'

            THEN d.first_attribution_confidence



          ELSE d.last_attribution_confidence



        END AS confidence



    ) a ON true





    GROUP BY

      p.period



  ),





  current_metrics AS (



    SELECT *



    FROM metrics



    WHERE period = 'current'



  ),





  previous_metrics AS (



    SELECT *



    FROM metrics



    WHERE period = 'previous'



  )





  SELECT



    jsonb_build_object(





      /* =====================================

         PERÍODO

         ===================================== */



      'period',



      jsonb_build_object(



        'timezone',

        v_timezone,



        'start_date',

        p_start_date,



        'end_date',

        p_end_date,



        'days',

        v_days,



        'previous_start_date',

        v_previous_start,



        'previous_end_date',

        v_previous_end,



        'attribution_model',

        v_model,



        'is_partial_period',

        v_is_partial,



        'cutoff_local_time',



        CASE



          WHEN v_is_partial THEN



            TO_CHAR(

              v_now_local,

              'HH24:MI:SS'

            )



          ELSE NULL



        END,



        'generated_at',

        v_now



      ),





      /* =====================================

         ATUAL

         ===================================== */



      'current',



      jsonb_build_object(



        'raw_events',

        c.raw_events,



        'valid_clicks',

        c.valid_clicks,



        'technical_duplicates',

        c.technical_duplicates,



        'unique_visitors',

        c.unique_visitors,



        'identified_visitor_clicks',

        c.identified_visitor_clicks,





        'visitor_id_coverage_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.identified_visitor_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'attributed_clicks',

        c.attributed_clicks,



        'confirmed_attribution_clicks',

        c.confirmed_attribution_clicks,



        'inferred_attribution_clicks',

        c.inferred_attribution_clicks,



        'legacy_attribution_clicks',

        c.legacy_attribution_clicks,





        'attribution_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.attributed_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'confirmed_attribution_rate',



        CASE



          WHEN c.valid_clicks = 0

            THEN 0



          ELSE ROUND(

            (

              c.confirmed_attribution_clicks::numeric

              /

              c.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'duplicate_rate',



        CASE



          WHEN c.raw_events = 0

            THEN 0



          ELSE ROUND(

            (

              c.technical_duplicates::numeric

              /

              c.raw_events::numeric

            ) * 100,

            2

          )



        END,





        'google_ads_clicks',

        c.google_ads_clicks,



        'meta_ads_clicks',

        c.meta_ads_clicks,



        'organic_clicks',

        c.organic_clicks,



        'direct_clicks',

        c.direct_clicks,



        'referral_clicks',

        c.referral_clicks



      ),





      /* =====================================

         ANTERIOR

         ===================================== */



      'previous',



      jsonb_build_object(



        'raw_events',

        prev.raw_events,



        'valid_clicks',

        prev.valid_clicks,



        'technical_duplicates',

        prev.technical_duplicates,



        'unique_visitors',

        prev.unique_visitors,



        'identified_visitor_clicks',

        prev.identified_visitor_clicks,



        'attributed_clicks',

        prev.attributed_clicks,



        'confirmed_attribution_clicks',

        prev.confirmed_attribution_clicks,



        'inferred_attribution_clicks',

        prev.inferred_attribution_clicks,



        'legacy_attribution_clicks',

        prev.legacy_attribution_clicks,



        'google_ads_clicks',

        prev.google_ads_clicks,



        'meta_ads_clicks',

        prev.meta_ads_clicks,



        'organic_clicks',

        prev.organic_clicks,



        'direct_clicks',

        prev.direct_clicks,



        'referral_clicks',

        prev.referral_clicks



      ),





      /* =====================================

         VARIAÇÕES

         ===================================== */



      'change',



      jsonb_build_object(





        'valid_clicks_pct',



        CASE



          WHEN prev.valid_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.valid_clicks -

                prev.valid_clicks

              )::numeric

              /

              prev.valid_clicks::numeric

            ) * 100,

            2

          )



        END,





        'google_ads_pct',



        CASE



          WHEN prev.google_ads_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.google_ads_clicks -

                prev.google_ads_clicks

              )::numeric

              /

              prev.google_ads_clicks::numeric

            ) * 100,

            2

          )



        END,





        'meta_ads_pct',



        CASE



          WHEN prev.meta_ads_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.meta_ads_clicks -

                prev.meta_ads_clicks

              )::numeric

              /

              prev.meta_ads_clicks::numeric

            ) * 100,

            2

          )



        END,





        'organic_pct',



        CASE



          WHEN prev.organic_clicks = 0

            THEN NULL



          ELSE ROUND(

            (

              (

                c.organic_clicks -

                prev.organic_clicks

              )::numeric

              /

              prev.organic_clicks::numeric

            ) * 100,

            2

          )



        END



      )



    )



  INTO v_result





  FROM current_metrics c



  CROSS JOIN previous_metrics prev;





  RETURN v_result;



END;



$function$

;

CREATE OR REPLACE FUNCTION public.dashboard_resolve_period(p_preset text DEFAULT '7d'::text, p_custom_start date DEFAULT NULL::date, p_custom_end date DEFAULT NULL::date)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text :=

    'America/Santiago';



  v_preset text :=

    LOWER(

      TRIM(

        COALESCE(

          p_preset,

          '7d'

        )

      )

    );



  v_now timestamptz :=

    NOW();



  v_now_local timestamp :=

    NOW()

    AT TIME ZONE 'America/Santiago';



  v_today date :=

    (

      NOW()

      AT TIME ZONE 'America/Santiago'

    )::date;



  v_start date;

  v_end date;



  v_label text;



  v_is_partial boolean;



  v_days integer;



BEGIN



  /* =========================================

     HOY

     ========================================= */



  IF v_preset IN (

    'today',

    'hoy'

  ) THEN



    v_start := v_today;

    v_end := v_today;

    v_label := 'Hoy';





  /* =========================================

     AYER

     ========================================= */



  ELSIF v_preset IN (

    'yesterday',

    'ayer'

  ) THEN



    v_start := v_today - 1;

    v_end := v_today - 1;

    v_label := 'Ayer';





  /* =========================================

     ÚLTIMOS 7 DÍAS

     inclui hoje

     ========================================= */



  ELSIF v_preset IN (

    '7d',

    '7days',

    'ultimos_7_dias'

  ) THEN



    v_start := v_today - 6;

    v_end := v_today;

    v_label := 'Últimos 7 días';





  /* =========================================

     ÚLTIMOS 30 DÍAS

     inclui hoje

     ========================================= */



  ELSIF v_preset IN (

    '30d',

    '30days',

    'ultimos_30_dias'

  ) THEN



    v_start := v_today - 29;

    v_end := v_today;

    v_label := 'Últimos 30 días';





  /* =========================================

     MES ACTUAL

     ========================================= */



  ELSIF v_preset IN (

    'current_month',

    'mes_actual'

  ) THEN



    v_start :=

      DATE_TRUNC(

        'month',

        v_today::timestamp

      )::date;



    v_end :=

      v_today;



    v_label :=

      'Mes actual';





  /* =========================================

     MES ANTERIOR COMPLETO

     ========================================= */



  ELSIF v_preset IN (

    'previous_month',

    'mes_anterior'

  ) THEN



    v_start :=

      (

        DATE_TRUNC(

          'month',

          v_today::timestamp

        )

        -

        INTERVAL '1 month'

      )::date;



    v_end :=

      (

        DATE_TRUNC(

          'month',

          v_today::timestamp

        )

        -

        INTERVAL '1 day'

      )::date;



    v_label :=

      'Mes anterior';





  /* =========================================

     PERSONALIZADO

     ========================================= */



  ELSIF v_preset IN (

    'custom',

    'personalizado'

  ) THEN



    IF

      p_custom_start IS NULL

      OR p_custom_end IS NULL

    THEN



      RAISE EXCEPTION

        'p_custom_start e p_custom_end são obrigatórios para período personalizado';



    END IF;





    IF p_custom_end < p_custom_start THEN



      RAISE EXCEPTION

        'p_custom_end não pode ser menor que p_custom_start';



    END IF;





    IF p_custom_end > v_today THEN



      RAISE EXCEPTION

        'p_custom_end não pode estar no futuro em America/Santiago';



    END IF;





    v_start :=

      p_custom_start;



    v_end :=

      p_custom_end;



    v_label :=

      'Personalizado';





  ELSE



    RAISE EXCEPTION

      'Preset inválido: %. Use hoy, ayer, 7d, 30d, mes_actual, mes_anterior ou personalizado.',

      v_preset;



  END IF;





  /* =========================================

     INFORMAÇÕES DERIVADAS

     ========================================= */



  v_days :=

    (

      v_end -

      v_start +

      1

    )::integer;





  v_is_partial :=

    (

      v_end = v_today

    );





  RETURN



    jsonb_build_object(



      'preset',

      v_preset,



      'label',

      v_label,



      'timezone',

      v_timezone,



      'start_date',

      v_start,



      'end_date',

      v_end,



      'days',

      v_days,



      'is_partial_period',

      v_is_partial,



      'cutoff_local_time',



      CASE



        WHEN v_is_partial THEN

          TO_CHAR(

            v_now_local,

            'HH24:MI:SS'

          )



        ELSE NULL



      END,



      'generated_at',

      v_now



    );



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

CREATE OR REPLACE FUNCTION public.dashboard_timeseries(p_start_date date, p_end_date date, p_attribution_model text DEFAULT 'last'::text)

 RETURNS jsonb

 LANGUAGE plpgsql

 STABLE

AS $function$



DECLARE



  v_timezone CONSTANT text :=

    'America/Santiago';



  v_model text :=

    LOWER(

      COALESCE(

        p_attribution_model,

        'last'

      )

    );



  v_now timestamptz :=

    NOW();



  v_now_local timestamp :=

    NOW() AT TIME ZONE 'America/Santiago';



  v_today_local date :=

    (

      NOW()

      AT TIME ZONE 'America/Santiago'

    )::date;



  v_days integer;



  v_previous_start date;

  v_previous_end date;



  v_current_start timestamptz;

  v_current_end timestamptz;



  v_previous_start_ts timestamptz;

  v_previous_end_ts timestamptz;



  v_is_partial boolean :=

    false;



  v_result jsonb;



BEGIN



  /* =========================================

     VALIDAÇÕES

     ========================================= */



  IF p_start_date IS NULL

     OR p_end_date IS NULL THEN



    RAISE EXCEPTION

      'p_start_date e p_end_date são obrigatórios';



  END IF;





  IF p_end_date < p_start_date THEN



    RAISE EXCEPTION

      'p_end_date não pode ser menor que p_start_date';



  END IF;





  IF p_end_date > v_today_local THEN



    RAISE EXCEPTION

      'p_end_date não pode estar no futuro em America/Santiago';



  END IF;





  IF v_model NOT IN ('first', 'last') THEN



    RAISE EXCEPTION

      'p_attribution_model deve ser first ou last';



  END IF;





  /* =========================================

     PERÍODOS

     ========================================= */



  v_days :=

    (

      p_end_date -

      p_start_date +

      1

    )::integer;





  v_previous_start :=

    p_start_date - v_days;





  v_previous_end :=

    p_start_date - 1;





  v_current_start :=

    (

      p_start_date::timestamp

      AT TIME ZONE v_timezone

    );





  v_previous_start_ts :=

    (

      v_previous_start::timestamp

      AT TIME ZONE v_timezone

    );





  /* =========================================

     PERÍODO PARCIAL

     ========================================= */



  IF p_end_date = v_today_local THEN



    v_is_partial :=

      true;



    v_current_end :=

      v_now;



    v_previous_end_ts :=

      (

        (

          v_previous_end

          + v_now_local::time

        )

        AT TIME ZONE v_timezone

      );





  ELSE



    v_current_end :=

      (

        (p_end_date + 1)::timestamp

        AT TIME ZONE v_timezone

      );



    v_previous_end_ts :=

      (

        p_start_date::timestamp

        AT TIME ZONE v_timezone

      );



  END IF;





  WITH



  /* =========================================

     DIAS PARA COMPARAÇÃO

     ========================================= */



  comparison_days AS (



    SELECT



      gs::date AS current_day,





      (

        v_previous_start

        +

        (

          gs::date -

          p_start_date

        )

      )::date AS previous_day,





      ROW_NUMBER() OVER (

        ORDER BY gs

      ) AS position





    FROM generate_series(



      p_start_date::timestamp,



      p_end_date::timestamp,



      INTERVAL '1 day'



    ) AS gs



  ),





  /* =========================================

     PERÍODO ATUAL POR CANAL

     ========================================= */



  current_data AS (



    SELECT



      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date AS day,





      CASE



        WHEN v_model = 'first'

          THEN d.first_channel_final



        ELSE d.last_channel_final



      END AS channel,





      COUNT(*)::bigint

        AS contacts





    FROM

      public.vw_whatsapp_leads_final d





    WHERE



      d.is_valid_click = true



      AND d.is_test_record = false



      AND d.clicked_at >=

          v_current_start



      AND d.clicked_at <

          v_current_end





    GROUP BY



      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date,





      CASE



        WHEN v_model = 'first'

          THEN d.first_channel_final



        ELSE d.last_channel_final



      END



  ),





  /* =========================================

     TOTAL ATUAL POR DIA

     ========================================= */



  current_total AS (



    SELECT



      day,



      SUM(contacts)::bigint

        AS contacts



    FROM current_data



    GROUP BY day



  ),





  /* =========================================

     PERÍODO ANTERIOR

     ========================================= */



  previous_total AS (



    SELECT



      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date AS day,





      COUNT(*)::bigint

        AS contacts





    FROM

      public.vw_whatsapp_leads_final d





    WHERE



      d.is_valid_click = true



      AND d.is_test_record = false



      AND d.clicked_at >=

          v_previous_start_ts



      AND d.clicked_at <

          v_previous_end_ts





    GROUP BY



      (

        d.clicked_at

        AT TIME ZONE v_timezone

      )::date



  ),





  /* =========================================

     COMPARAÇÃO DIA A DIA

     ========================================= */



  comparison AS (



    SELECT



      cd.position,



      cd.current_day,



      cd.previous_day,





      COALESCE(

        ct.contacts,

        0

      )::bigint AS current_contacts,





      COALESCE(

        pt.contacts,

        0

      )::bigint AS previous_contacts





    FROM comparison_days cd





    LEFT JOIN current_total ct



      ON ct.day =

         cd.current_day





    LEFT JOIN previous_total pt



      ON pt.day =

         cd.previous_day



  ),





  /* =========================================

     TOTAIS

     ========================================= */



  totals AS (



    SELECT



      COALESCE(

        SUM(current_contacts),

        0

      )::bigint AS current_contacts,





      COALESCE(

        SUM(previous_contacts),

        0

      )::bigint AS previous_contacts



    FROM comparison



  )





  SELECT



    jsonb_build_object(





      /* =====================================

         META

         ===================================== */



      'meta',



      jsonb_build_object(



        'timezone',

        v_timezone,



        'start_date',

        p_start_date,



        'end_date',

        p_end_date,



        'days',

        v_days,



        'previous_start_date',

        v_previous_start,



        'previous_end_date',

        v_previous_end,



        'attribution_model',

        v_model,



        'is_partial_period',

        v_is_partial,



        'cutoff_local_time',



        CASE



          WHEN v_is_partial

            THEN TO_CHAR(

              v_now_local,

              'HH24:MI:SS'

            )



          ELSE NULL



        END,



        'generated_at',

        v_now



      ),





      /* =====================================

         TOTAIS

         ===================================== */



      'totals',



      (



        SELECT



          jsonb_build_object(



            'current_contacts',

            t.current_contacts,



            'previous_contacts',

            t.previous_contacts,





            'change_pct',



            CASE



              WHEN t.previous_contacts = 0

                THEN NULL



              ELSE ROUND(

                (

                  (

                    t.current_contacts -

                    t.previous_contacts

                  )::numeric

                  /

                  t.previous_contacts::numeric

                ) * 100,

                2

              )



            END



          )



        FROM totals t



      ),





      /* =====================================

         COMPARAÇÃO

         ===================================== */



      'comparison',



      COALESCE(



        (



          SELECT



            jsonb_agg(



              jsonb_build_object(



                'position',

                c.position,



                'current_day',

                c.current_day,



                'previous_day',

                c.previous_day,



                'current_contacts',

                c.current_contacts,



                'previous_contacts',

                c.previous_contacts,





                'is_partial_day',



                (

                  v_is_partial

                  AND

                  c.current_day =

                    p_end_date

                ),





                'change_pct',



                CASE



                  WHEN c.previous_contacts = 0

                    THEN NULL



                  ELSE ROUND(

                    (

                      (

                        c.current_contacts -

                        c.previous_contacts

                      )::numeric

                      /

                      c.previous_contacts::numeric

                    ) * 100,

                    2

                  )



                END



              )



              ORDER BY

                c.position



            )



          FROM comparison c



        ),



        '[]'::jsonb



      ),





      /* =====================================

         CANAIS

         ===================================== */



      'channels',



      COALESCE(



        (



          SELECT



            jsonb_agg(



              jsonb_build_object(



                'day',

                x.day,



                'channel',

                x.channel,



                'contacts',

                x.contacts



              )



              ORDER BY

                x.day,

                x.contacts DESC,

                x.channel



            )



          FROM current_data x



        ),



        '[]'::jsonb



      )



    )



  INTO v_result;





  RETURN v_result;



END;



$function$

;