# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY app ./app
COPY .claude ./.claude
COPY site ./site
COPY scripts/build.mjs ./scripts/build.mjs
COPY sessions ./sessions
COPY LICENSE THIRD_PARTY_NOTICES.md ./
ARG REVISION
ENV COUNCIL_BUILD_REVISION=$REVISION
RUN node scripts/build.mjs

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/package.json ./package.json
COPY --from=build /build/dist ./dist
COPY app/lib ./app/lib
COPY service ./service
COPY LICENSE ./LICENSE
RUN rm -rf /app/dist/data
ARG REVISION
ENV NODE_ENV=production GIT_COMMIT=$REVISION PORT=4730
USER node
EXPOSE 4730
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s \
 CMD node -e "fetch('http://127.0.0.1:4730/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "service/server.mjs"]
