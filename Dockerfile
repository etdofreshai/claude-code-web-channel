FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production --no-summary

COPY . .

ENV WEB_CHANNEL_PORT=3000
ENV WEB_CHANNEL_HOST=0.0.0.0
ENV WEB_STATE_DIR=/data
EXPOSE 3000

# Create state directories
RUN mkdir -p /data/inbox /data/outbox /data/approved

CMD ["bun", "server.ts"]
