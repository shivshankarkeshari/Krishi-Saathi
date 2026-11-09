FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
ENV WRANGLER_SEND_METRICS=false SHARP_IGNORE_GLOBAL_LIBVIPS=1
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

FROM dependencies AS build
COPY . .
RUN npm run build

FROM build AS runtime
ENV NODE_ENV=production LOCAL_DEMO=1
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
