# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# Runtime stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

#COPY wait-for-db.sh .
#RUN chmod +x wait-for-db.sh

EXPOSE 3000

CMD ["npm", "start"]