FROM node:22-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
EXPOSE 5174
# npm install na subida: dependências novas entram sem reconstruir a imagem.
CMD ["sh", "-c", "npm install --no-audit --no-fund && npm run dev -- --host"]
