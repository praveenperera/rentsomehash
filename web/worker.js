const CALCULATOR_PATH = "/api/hashpower-calculator";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === CALCULATOR_PATH) {
      return proxyCalculator(request, env, url.pathname);
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};

async function proxyCalculator(request, env, path) {
  const clientIp =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  const { success } = await env.CALCULATOR_RATE_LIMITER.limit({
    key: `${path}:${clientIp}`,
  });

  if (!success) {
    return Response.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many calculator requests",
          fields: [],
        },
      },
      { status: 429 },
    );
  }

  return env.HASHPOWER_API.fetch(request);
}
