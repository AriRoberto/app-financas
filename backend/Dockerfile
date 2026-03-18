FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json ./package.json
COPY backend/node_modules ./node_modules
COPY backend/src ./src
COPY backend/migrations ./migrations
COPY backend/.env.example ./.env.example
COPY backend/data ./data
EXPOSE 3333
CMD ["node", "src/server.js"]
