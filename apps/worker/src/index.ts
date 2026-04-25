type Env = {
  RECAPTCHA_SECRET_KEY: string;
  ALLOWED_ORIGIN: string;
  ALLOWED_HOSTNAME: string;
};

type VerifyApiResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Access-Control-Allow-Origin": init?.headers instanceof Headers
        ? init.headers.get("Access-Control-Allow-Origin") ?? "*"
        : "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Content-Type": "application/json; charset=utf-8"
    }
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? env.ALLOWED_ORIGIN;
    const corsHeaders = new Headers({
      "Access-Control-Allow-Origin": origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    });

    if (request.method === "OPTIONS") {
      if (origin !== env.ALLOWED_ORIGIN) {
        return json({ success: false, message: "Origin not allowed." }, { status: 403, headers: corsHeaders });
      }

      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ success: false, message: "Method not allowed." }, { status: 405, headers: corsHeaders });
    }

    if (origin !== env.ALLOWED_ORIGIN) {
      return json({ success: false, message: "Origin not allowed." }, { status: 403, headers: corsHeaders });
    }

    if (!env.RECAPTCHA_SECRET_KEY) {
      return json({ success: false, message: "Missing RECAPTCHA_SECRET_KEY." }, { status: 500, headers: corsHeaders });
    }

    try {
      const { token } = (await request.json()) as { token?: string };

      if (!token) {
        return json({ success: false, message: "Missing reCAPTCHA token." }, { status: 400, headers: corsHeaders });
      }

      const remoteIp = request.headers.get("CF-Connecting-IP") ?? "";

      const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          secret: env.RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: remoteIp
        })
      });

      const verifyResult = (await verifyResponse.json()) as VerifyApiResponse;

      if (!verifyResponse.ok || !verifyResult.success) {
        return json(
          {
            success: false,
            message: "reCAPTCHA verification failed.",
            errors: verifyResult["error-codes"] ?? []
          },
          { status: 401, headers: corsHeaders }
        );
      }

      if (verifyResult.hostname !== env.ALLOWED_HOSTNAME) {
        return json(
          {
            success: false,
            message: "Unexpected reCAPTCHA hostname."
          },
          { status: 403, headers: corsHeaders }
        );
      }

      return json(
        {
          success: true,
          message: "Human verified. Access denied."
        },
        { status: 200, headers: corsHeaders }
      );
    } catch {
      return json({ success: false, message: "Invalid request body." }, { status: 400, headers: corsHeaders });
    }
  }
};
