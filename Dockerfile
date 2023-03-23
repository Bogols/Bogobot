FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

FROM base as build
RUN export NODE_ENV=production
RUN npm install -g dotenv-cli
RUN npm ci

COPY . ./
# RUN npx prisma migrate deploy
RUN npm run prisma:migrate
RUN npx prisma generate
RUN npm run build

CMD npm run start
