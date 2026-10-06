#!/usr/bin/env python3
"""Idempotent, guard-railed GoDaddy DNS writes for the Magnifica Humanitas publication.

This script can ONLY ever touch two names in the catholic.work zone:

    magnifica        the static publication  -> Cloudflare Pages
    cms.magnifica    the Payload admin UI    -> chroma-server

Everything else in that zone is a live production surface for somebody else:
`@` and `www` serve the WordPress apex, `learn`/`make`/`ai`/... serve the shared
WordPress host, `genesis`/`patriarchs` serve Firebase Hosting, `@` carries the MX
and an SPF TXT the client's M365 tenant depends on. The whitelist below is checked
BEFORE any API call is made, so a typo cannot reach them.

Credential values are read from the vault and never printed. Only record names and
HTTP status codes go to stdout.

Usage
-----
  godaddy_magnifica.py --upsert A     cms.magnifica 31.97.65.164
  godaddy_magnifica.py --upsert CNAME magnific      magnifica-humanitas.pages.dev
  godaddy_magnifica.py --dry-run --upsert CNAME magnific magnifica-humanitas.pages.dev
  godaddy_magnifica.py --delete cms.magnifica
  godaddy_magnifica.py --list
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request

DOMAIN = "catholic.work"
API = f"https://api.godaddy.com/v1/domains/{DOMAIN}/records"
SECRETS = "/home/barry-schoedel/Documents/Obsidian Vault/80 ⚡ System/Secrets.md"

# The ONLY names this script may write. Never add "@" or "www" here.
ALLOWED_NAMES = {"magnifica", "cms.magnifica"}
WRITABLE_TYPES = {"A", "AAAA", "CNAME", "TXT"}
# Types checked for CNAME-exclusivity conflicts (GoDaddy 422s when a name already
# holds any other record type).
ALL_TYPES = ("A", "AAAA", "CNAME", "TXT")


def creds():
    txt = open(SECRETS, encoding="utf-8", errors="replace").read()

    def val(name):
        m = re.search(r'^\s*' + name + r'\s*=\s*"([^"]+)"', txt, re.M)   # shell-style
        if m:
            return m.group(1).strip()
        m = re.search(r'\|\s*' + name + r'\s*\|\s*([^|\n]+)\s*\|', txt)  # table fallback
        return m.group(1).strip().strip('"').strip() if m else None

    key, secret = val("GODADDY_API_KEY"), val("GODADDY_API_SECRET")
    if not key or not secret:
        sys.exit("FATAL: GODADDY_API_KEY / GODADDY_API_SECRET not found in Secrets.md")
    return key, secret


def call(method: str, path: str, payload=None):
    key, secret = creds()
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        API + path,
        data=body,
        method=method,
        headers={
            "Authorization": f"sso-key {key}:{secret}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        return e.code, detail


def guard_name(name: str) -> str:
    name = (name or "").strip().lower().rstrip(".")
    if name not in ALLOWED_NAMES:
        sys.exit(f"REFUSING: '{name}' is outside the allow-list {sorted(ALLOWED_NAMES)}. "
                 f"This script must never touch the apex, www, or any sibling subdomain.")
    return name


def existing(name: str):
    """Return {type: [records]} for every type that currently answers at `name`."""
    found = {}
    for t in ALL_TYPES:
        st, body = call("GET", f"/{t}/{name}")
        if st == 200 and isinstance(body, list) and body:
            found[t] = body
    return found


def cmd_upsert(name: str, rtype: str, value: str, ttl: int, dry: bool) -> int:
    name = guard_name(name)
    rtype = rtype.upper()
    if rtype not in WRITABLE_TYPES:
        sys.exit(f"REFUSING: type {rtype} is not in {sorted(WRITABLE_TYPES)}")

    print(f"=== target {name}.{DOMAIN}  type={rtype}  value={value}  ttl={ttl} ===")
    current = existing(name)
    if current:
        for t, recs in sorted(current.items()):
            for r in recs:
                print(f"  currently present: {t:5} {r.get('data')}")
    else:
        print("  currently present: (nothing — name is free)")

    # CNAME exclusivity: refuse to write if the name holds records of another type.
    conflicts = {t: recs for t, recs in current.items() if t != rtype}
    if conflicts:
        print(f"\nREFUSING: {name} already holds {sorted(conflicts)}. A record of a different "
              f"type at the same name is a conflict (GoDaddy 422 DUPLICATE_RECORD, and for a "
              f"CNAME it would break the existing service). Resolve this by hand.")
        return 2

    # PUT replaces the WHOLE RRset for name+type, so send the complete intended set.
    desired = [{"data": value, "ttl": ttl}]
    if dry:
        print(f"\n[dry-run] would PUT /{rtype}/{name} <- {json.dumps(desired)}")
        return 0
    st, body = call("PUT", f"/{rtype}/{name}", desired)
    print(f"\nPUT /{rtype}/{name} -> HTTP {st}")
    if st not in (200, 201):
        print(f"  response: {body}")
        return 1
    print("  OK — write accepted (authoritative NS lags ~30-60 s)")
    return 0


def cmd_delete(name: str, dry: bool) -> int:
    name = guard_name(name)
    print(f"=== delete every record at {name}.{DOMAIN} ===")
    current = existing(name)
    if not current:
        print("  nothing to delete (name already free)")
        return 0
    for t in sorted(current):
        if dry:
            print(f"[dry-run] would DELETE /{t}/{name}")
            continue
        st, body = call("DELETE", f"/{t}/{name}")
        print(f"  DELETE /{t}/{name} -> HTTP {st}")
    return 0


def cmd_list() -> int:
    for t in ("A", "CNAME"):
        st, body = call("GET", f"/{t}")
        print(f"=== {t} (HTTP {st}) ===")
        if isinstance(body, list):
            for r in sorted(body, key=lambda x: x.get("name", "")):
                mark = "  <== OUR NAMESPACE" if r.get("name") in ALLOWED_NAMES or \
                       str(r.get("name", "")).endswith("magnifica") else ""
                print(f"  {r.get('name'):<28} {r.get('data')}{mark}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--upsert", nargs=3, metavar=("TYPE", "NAME", "VALUE"))
    p.add_argument("--delete", metavar="NAME")
    p.add_argument("--list", action="store_true")
    p.add_argument("--ttl", type=int, default=600)
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()

    if a.upsert:
        rtype, name, value = a.upsert
        return cmd_upsert(name, rtype, value, a.ttl, a.dry_run)
    if a.delete:
        return cmd_delete(a.delete, a.dry_run)
    if a.list:
        return cmd_list()
    p.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
