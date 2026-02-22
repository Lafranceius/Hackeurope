"""
Agent Pipeline CLI Runner
=========================
Spawned by the Next.js backend to run the data-cleaning pipeline asynchronously.

Usage:
    python api/runner.py \
        --job-id <jobId> \
        --file-path <absolutePathToExcelFile> \
        --callback-url <http://localhost:3000/api/jobs/<jobId>/complete> \
        --callback-secret <AGENT_CALLBACK_SECRET>

The runner:
  1. Copies the source file to a <uuid>_cleaned_<original> path.
  2. Runs run_agentic_pipeline() on the copy.
  3. POSTs {status, resultJson|errorMessage} to the callback URL.

Exit codes: 0 = success (callback sent), 1 = fatal error before callback.
"""

import argparse
import asyncio
import json
import shutil
import sys
import uuid
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

# ---------------------------------------------------------------------------
# Add api/ to path so agents_pipeline can be imported regardless of cwd
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))

from agents_pipeline import run_agentic_pipeline  # noqa: E402


def _post_callback(url: str, secret: str, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Callback-Secret": secret,
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            print(f"[runner] Callback response: {resp.status}", flush=True)
    except URLError as exc:
        print(f"[runner] WARNING: callback failed: {exc}", file=sys.stderr, flush=True)


async def run(file_path: str, job_id: str, callback_url: str, callback_secret: str) -> None:
    src = Path(file_path)
    if not src.exists():
        _post_callback(callback_url, callback_secret, {
            "status": "FAILED",
            "errorMessage": f"Source file not found: {file_path}",
        })
        return

    # Work on a copy so the original is preserved
    cleaned_name = f"{uuid.uuid4().hex}_cleaned_{src.name}"
    cleaned_path = src.parent / cleaned_name
    shutil.copy2(src, cleaned_path)
    print(f"[runner] Working copy: {cleaned_path}", flush=True)

    try:
        await run_agentic_pipeline(str(cleaned_path))
        _post_callback(callback_url, callback_secret, {
            "status": "SUCCEEDED",
            "resultJson": {
                "cleanedFileUrl": f"/uploads/{cleaned_name}",
                "cleanedFileName": f"cleaned_{src.name}",
                "summary": "Agent pipeline completed — columns classified and formatted.",
            },
        })
    except Exception as exc:
        # Clean up the copy on failure
        if cleaned_path.exists():
            cleaned_path.unlink(missing_ok=True)
        _post_callback(callback_url, callback_secret, {
            "status": "FAILED",
            "errorMessage": str(exc)[:500],
        })


def main() -> None:
    parser = argparse.ArgumentParser(description="Hackeurope agent pipeline runner")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--file-path", required=True)
    parser.add_argument("--callback-url", required=True)
    parser.add_argument("--callback-secret", required=True)
    args = parser.parse_args()

    print(f"[runner] Starting job {args.job_id} on {args.file_path}", flush=True)
    asyncio.run(run(args.file_path, args.job_id, args.callback_url, args.callback_secret))


if __name__ == "__main__":
    main()
