# The app is a long-lived Express server that also serves the built client.
# Static-only hosting publishes dist/ without ever running dist/server.js, which
# leaves every /api call answering with the platform's own 404 page.

FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Produces dist/ (client), dist/server.js, and dist/pdfExtractionWorker.mjs.
RUN npm run build

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node

# The host supplies PORT; the server already binds 0.0.0.0 so the platform can
# reach it. Uploads additionally need PLASGAIN_KNOWLEDGE_BUCKET (GCS) or
# PLASGAIN_KNOWLEDGE_DIR (mounted persistent disk) — see the README. Without
# one, the server stays up and refuses uploads rather than losing documents.
CMD ["node", "dist/server.js"]
