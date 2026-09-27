# Router endpoint for agent/src/memory.ts: POST /route {"text"} -> {"intent", "confidence"} (data/ROUTER.md).
# Port 8789 (8788 is the canonical-v1 normalizer). Run: .venv/bin/python serve.py --run r1 [--step 100]
#   ROUTER_URL=http://127.0.0.1:8789/route
import argparse, json, re, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from common import BASE, HERE, LABELS, TAGS, classify, client, renderer

ap = argparse.ArgumentParser()
ap.add_argument("--run", required=True)
ap.add_argument("--step", help="checkpoint step (default: latest)")
ap.add_argument("--port", type=int, default=8789)
ap.add_argument("--min-confidence", type=float, default=0.5, help="below this, answer none (caller explores); 0.5 beat no gate on hit and wrong recall in eval_recall.ts")
args = ap.parse_args()

import river_client as river
ckpts = json.loads((HERE / "runs" / args.run / "report.json").read_text())["checkpoints"]
step = args.step or max(ckpts, key=int)
ckpt = river.Checkpoint(**ckpts[step])
rend, c = renderer(), client()
ctx = c.session(**TAGS, role=f"serve-{args.run}")
session = ctx.__enter__()
# Customers don't type snake_case labels or talk to the system prompt; such text is answered none (agent explores).
INJECTION = re.compile(r"ignore (all |any |the )?(previous|prior|above|earlier) (instructions|prompts?)|system prompt|you are now|"
                       r"(output|respond with|reply with|return) (the )?(label|intent)?\s*\S*_|" + "|".join(l for l in LABELS if "_" in l), re.I)


def route(text: str) -> dict:
    """River call with one retry inside the caller's 15 s budget (River occasionally exceeds 8 s)."""
    t0 = time.monotonic()
    try:
        return classify(session, rend, [text], checkpoint=ckpt, timeout=8)[0]
    except Exception:
        left = 14 - (time.monotonic() - t0)
        if left < 3: raise
        return classify(session, rend, [text], checkpoint=ckpt, timeout=left)[0]


class H(BaseHTTPRequestHandler):
    def reply(self, code, body):
        b = json.dumps(body).encode()
        self.send_response(code); self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(b)))
        self.end_headers(); self.wfile.write(b)

    def do_GET(self):
        self.reply(200, {"ok": True, "model": BASE, "run": args.run, "checkpoint": ckpts[step]["path"], "step": int(step)})

    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)) or b"{}")
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, {"error": "body must be JSON {\"text\": ...}"})
        text = body.get("text", "") if isinstance(body, dict) else ""
        if not isinstance(text, str) or not text.strip():
            return self.reply(400, {"error": "text required"})
        if INJECTION.search(text):
            return self.reply(200, {"intent": "none", "confidence": 0.0, "predicted": None, "guard": "instruction-like text", "model": f"river:{args.run}@{step}"})
        try:
            p = route(text)
        except Exception as e:  # the caller falls back to raw text on any non-200
            return self.reply(502, {"error": type(e).__name__})
        intent = p["intent"] if (p["confidence"] or 0) >= args.min_confidence else "none"
        self.reply(200, {"intent": intent, "confidence": p["confidence"], "predicted": p["intent"], "model": f"river:{args.run}@{step}"})

    def log_message(self, fmt, *a):
        print(fmt % a, flush=True)


print(f"router on http://127.0.0.1:{args.port}/route  ({args.run} step {step}, min confidence {args.min_confidence})", flush=True)
try:
    ThreadingHTTPServer(("127.0.0.1", args.port), H).serve_forever()
finally:
    ctx.__exit__(None, None, None); c.close()
