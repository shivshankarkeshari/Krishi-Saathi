#!/bin/sh
set -eu
# Wrangler reads runtime variables from a file inside the disposable container layer.
# Never copy host Codex authentication or credentials into this image.
node -e 'const fs=require("node:fs"); const keys=["LOCAL_DEMO","OLLAMA_URL","OLLAMA_MODEL","AI_BRIDGE_URL","AI_BRIDGE_TOKEN","OPENAI_BASE_URL","OPENAI_API_KEY","OPENAI_MODEL","SPEECH_URL"]; const data=keys.filter(k=>process.env[k]).map(k=>k+"="+JSON.stringify(process.env[k])).join("\n")+"\n"; fs.writeFileSync(".dev.vars",data); fs.writeFileSync("dist/server/.dev.vars",data)'
node scripts/local-migrate.mjs
exec node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to .wrangler/state --ip 0.0.0.0 --port 3000 --inspector-port 0
