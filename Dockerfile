FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
