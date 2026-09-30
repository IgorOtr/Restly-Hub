FROM node:22-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 3100
# npm install na subida: dependências novas entram sem reconstruir a imagem.
CMD ["sh", "-c", "npm install --no-audit --no-fund && npx prisma migrate deploy && npm run start:dev"]
