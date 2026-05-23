# v0.3.0 Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server/  server/
COPY screen/  screen/
COPY controller/ controller/

ENV PORT=3000
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/__health',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "server/server.js"]
