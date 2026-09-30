FROM node:22-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 3100
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
