const CANONICAL_HOSTNAME = "rentsomehash.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.protocol !== "https:" ||
      url.hostname === `www.${CANONICAL_HOSTNAME}`
    ) {
      url.protocol = "https:";
      url.hostname = CANONICAL_HOSTNAME;
      url.port = "";

      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};
