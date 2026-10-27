// Cutover redirects for the 2026-10-27 publication rename: the content moved from
// magnifica.agentesfidei.org to magnifici.agentesfidei.org, and the apex is now a pointer.
//
// One MAP entry per retiring hostname; the worker preserves path AND query so every
// distributed deep link keeps working. This mirrors the catholic-work-redirects project's
// host->URL map pattern (that project's source is not in this repo, so its worker is left
// untouched — a new project for this cutover avoids reconstructing entries from live traffic).
//
// Deploy: ops/cloudflare/deploy-magnifici-redirects.sh (needs CLOUDFLARE_API_TOKEN with
// Pages:Edit on the account — the "open token" in 80 System/Secrets.md).
const MAP = {
  // The old distributed links: https://magnifica.agentesfidei.org/…
  "magnifica.agentesfidei.org": "https://magnifici.agentesfidei.org",
  // The apex was mail-only (no A/AAAA); it now visibly points the apostolate at the publication.
  "agentesfidei.org": "https://magnifici.agentesfidei.org",
};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const dest = MAP[url.hostname.toLowerCase()];
    if (!dest) return new Response("Not found", { status: 404 });
    return Response.redirect(dest + url.pathname + url.search, 301);
  },
};