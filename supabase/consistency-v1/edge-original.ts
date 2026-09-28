import { createClient } from "npm:@supabase/supabase-js@2";

/* =====================================================
   CONFIGURAÇÃO SUPABASE
   ===================================================== */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


/* =====================================================
   ORIGENS PERMITIDAS
   ===================================================== */

const defaultOrigins = [
  "https://adonay.cl",
  "https://www.adonay.cl",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://dahsadonay.vercel.app",
];

const extraOrigins = (
  Deno.env.get("DASHBOARD_ALLOWED_ORIGINS") || ""
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...defaultOrigins,
  ...extraOrigins,
]);


/* =====================================================
   E-MAILS AUTORIZADOS
   ===================================================== */

const allowedEmails = new Set(
  (
    Deno.env.get("DASHBOARD_ALLOWED_EMAILS") || ""
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);


/* =====================================================
   HELPERS
   ===================================================== */

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store",

    "Vary":
      "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}


function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: corsHeaders(origin),
    },
  );
}


function cleanText(
  value: unknown,
  maxLength = 100,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}


function isValidDate(
  value: string | null,
) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}


/* =====================================================
   EDGE FUNCTION
   ===================================================== */

Deno.serve(async (req: Request) => {

  const origin =
    req.headers.get("origin");


  /* ===================================================
     CORS
     =================================================== */

  if (
    origin &&
    !allowedOrigins.has(origin)
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "origin_not_allowed",
      },
      403,
      null,
    );
  }


  if (req.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders(origin),
      },
    );
  }


  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return jsonResponse(
      {
        ok: false,
        error: "method_not_allowed",
      },
      405,
      origin,
    );
  }


  try {

    /* =================================================
       AUTENTICAÇÃO
       ================================================= */

    const authHeader =
      req.headers.get("authorization");


    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "authentication_required",
        },
        401,
        origin,
      );
    }


    /* =================================================
       CLIENTE PARA VALIDAR O USUÁRIO
       ================================================= */

    const authClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },

          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );


    const {
      data: userData,
      error: userError,
    } =
      await authClient.auth.getUser();


    if (
      userError ||
      !userData.user
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "invalid_session",
        },
        401,
        origin,
      );
    }


    const userEmail =
      (
        userData.user.email || ""
      )
        .trim()
        .toLowerCase();


    /* =================================================
       SEGURANÇA POR E-MAIL
       ================================================= */

    if (allowedEmails.size === 0) {

      console.error(
        "[DASHBOARD] DASHBOARD_ALLOWED_EMAILS não configurado",
      );

      return jsonResponse(
        {
          ok: false,
          error: "dashboard_access_not_configured",
        },
        503,
        origin,
      );
    }


    if (
      !userEmail ||
      !allowedEmails.has(userEmail)
    ) {
      console.warn(
        "[DASHBOARD] Usuário sem autorização",
        {
          user_id: userData.user.id,
        },
      );

      return jsonResponse(
        {
          ok: false,
          error: "access_denied",
        },
        403,
        origin,
      );
    }


    /* =================================================
       RECEBER PARÂMETROS
       ================================================= */

    let input: Record<string, unknown> = {};


    if (req.method === "GET") {

      const url =
        new URL(req.url);

      input = {

        preset:
          url.searchParams.get("preset"),

        attribution_model:
          url.searchParams.get("attribution") ||
          url.searchParams.get("attribution_model"),

        custom_start:
          url.searchParams.get("start") ||
          url.searchParams.get("custom_start"),

        custom_end:
          url.searchParams.get("end") ||
          url.searchParams.get("custom_end"),

        limit:
          url.searchParams.get("limit"),

      };

    } else {

      try {
        input = await req.json();
      } catch {
        input = {};
      }

    }


    /* =================================================
       PRESET
       ================================================= */

    const preset =
      (
        cleanText(
          input.preset,
          30,
        ) || "7d"
      ).toLowerCase();


    const validPresets =
      new Set([
        "today",
        "hoy",

        "yesterday",
        "ayer",

        "7d",
        "7days",
        "ultimos_7_dias",

        "30d",
        "30days",
        "ultimos_30_dias",

        "current_month",
        "mes_actual",

        "previous_month",
        "mes_anterior",

        "custom",
        "personalizado",
      ]);


    if (!validPresets.has(preset)) {
      return jsonResponse(
        {
          ok: false,
          error: "invalid_preset",
        },
        400,
        origin,
      );
    }


    /* =================================================
       MODELO DE ATRIBUIÇÃO
       ================================================= */

    const attributionModel =
      (
        cleanText(
          input.attribution_model ??
          input.attribution,
          10,
        ) || "last"
      ).toLowerCase();


    if (
      attributionModel !== "first" &&
      attributionModel !== "last"
    ) {
      return jsonResponse(
        {
          ok: false,
          error: "invalid_attribution_model",
        },
        400,
        origin,
      );
    }


    /* =================================================
       LIMIT
       ================================================= */

    const rawLimit =
      Number(
        input.limit ?? 20,
      );


    const limit =
      Number.isFinite(rawLimit)
        ? Math.max(
            1,
            Math.min(
              Math.trunc(rawLimit),
              100,
            ),
          )
        : 20;


    /* =================================================
       PERÍODO PERSONALIZADO
       ================================================= */

    const customStart =
      cleanText(
        input.custom_start ??
        input.start,
        10,
      );


    const customEnd =
      cleanText(
        input.custom_end ??
        input.end,
        10,
      );


    const isCustom =
      preset === "custom" ||
      preset === "personalizado";


    if (isCustom) {

      if (
        !isValidDate(customStart) ||
        !isValidDate(customEnd)
      ) {
        return jsonResponse(
          {
            ok: false,
            error: "invalid_custom_period",
          },
          400,
          origin,
        );
      }

    }


    /* =================================================
       CLIENTE ADMIN

       Service Role somente no backend.
       ================================================= */

    const admin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );


    /* =================================================
       CHAMA NOSSO SNAPSHOT
       ================================================= */

    const {
      data,
      error,
    } =
      await admin.rpc(
        "dashboard_snapshot",
        {
          p_preset: preset,

          p_attribution_model:
            attributionModel,

          p_custom_start:
            isCustom
              ? customStart
              : null,

          p_custom_end:
            isCustom
              ? customEnd
              : null,

          p_limit:
            limit,
        },
      );


    /* =================================================
       ERRO SQL
       ================================================= */

    if (error) {

      console.error(
        "[DASHBOARD] RPC ERROR",
        {
          code: error.code,
          message: error.message,
        },
      );


      const status =
        error.code === "P0001"
          ? 400
          : 500;


      return jsonResponse(
        {
          ok: false,

          error:
            status === 400
              ? "invalid_parameters"
              : "dashboard_query_failed",
        },
        status,
        origin,
      );
    }


    /* =================================================
       CHECK DE INTEGRIDADE
       ================================================= */

    if (
      data?.integrity
        ?.core_totals_match !== true
    ) {

      console.error(
        "[DASHBOARD] Divergência de integridade",
        data?.integrity,
      );

    }


    /* =================================================
       RESPOSTA FINAL
       ================================================= */

    return jsonResponse(
      {
        ok: true,
        data,
      },
      200,
      origin,
    );


  } catch (error) {

    console.error(
      "[DASHBOARD] ERRO INTERNO",
      error,
    );


    return jsonResponse(
      {
        ok: false,
        error: "internal_server_error",
      },
      500,
      origin,
    );

  }

});