FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEURA_API_URL=https://neura-api-production-3427.up.railway.app
ENV NEURA_API_URL=$NEURA_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S neura && adduser -S neura -G neura
COPY --from=builder --chown=neura:neura /app/public ./public
COPY --from=builder --chown=neura:neura /app/.next/standalone ./
COPY --from=builder --chown=neura:neura /app/.next/static ./.next/static
USER neura
EXPOSE 3000
CMD ["sh", "-c", "node server.js"]
