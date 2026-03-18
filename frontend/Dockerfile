FROM node:22-alpine
WORKDIR /app
COPY frontend/package.json ./package.json
COPY frontend/index.html ./index.html
COPY frontend/src ./src
COPY frontend/scripts ./scripts
RUN npm run build
EXPOSE 5173
CMD ["node", "scripts/serve-dist.mjs"]
