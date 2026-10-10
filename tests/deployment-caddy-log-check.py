import json
import sys


def fail(code):
    print(code, file=sys.stderr)
    raise SystemExit(1)


if len(sys.argv) != 3:
    fail("CI_CADDY_LOG_CHECK_INPUT_INVALID")

try:
    with open(sys.argv[1], encoding="utf-8") as log_file:
        raw_log = log_file.read()
except OSError:
    fail("CI_CADDY_LOG_UNREADABLE")

synthetic_values = (
    "SYNTHETIC_AUTH_HEADER",
    "SYNTHETIC_COOKIE_VALUE",
    "SYNTHETIC_REQUEST_HEADER",
    "SYNTHETIC_QUERY_VALUE",
    "SYNTHETIC_CONTACT_QUERY",
    "SYNTHETIC_REQUEST_BODY",
    "203.0.113.41",
    sys.argv[2],
)
if any(value and value in raw_log for value in synthetic_values):
    fail("CI_CADDY_LOG_SENSITIVE_MARKER_FOUND")

records = []
for line in raw_log.splitlines():
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        continue
    if isinstance(entry, dict) and isinstance(entry.get("request"), dict):
        records.append(entry)

if len(records) < 2:
    fail("CI_CADDY_ACCESS_LOG_RECORDS_MISSING")

for entry in records:
    request = entry["request"]
    for field in ("headers", "uri", "body", "remote_ip", "client_ip"):
        if field in request:
            fail("CI_CADDY_LOG_PRIVATE_FIELD_RETAINED")

print(f"CI_CADDY_ACCESS_LOG_REDACTION_OK records={len(records)}")
