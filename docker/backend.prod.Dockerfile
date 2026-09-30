# ── Build ──
FROM node:22-alpine AS build
WORKDIR /app
COPY backend .
RUN npm ci && npx prisma generate && npm run build

# ── Runtime: somente dependências de produção ──
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./
COPY backend/prisma ./prisma
COPY backend/prisma.config.ts ./prisma.config.ts
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3100
CMD ["sh", "-c", "npx prisma migrate deploy && exec node $NODE_FLAGS dist/src/main.js"]
