export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

export function apiError(code: string, message: string, status = 400) {
  return jsonResponse({ code, message }, status);
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
