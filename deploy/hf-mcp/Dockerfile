FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core packages/core
COPY apps/api apps/api
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
RUN npm ci && npm run build -w @nxtl/api
ENV PORT=7860
EXPOSE 7860
CMD ["node", "apps/api/dist/http.mjs"]
