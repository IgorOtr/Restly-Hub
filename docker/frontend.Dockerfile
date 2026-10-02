FROM node:22-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
EXPOSE 5174
# npm install na subida: dependências novas entram sem reconstruir a imagem.
# exec: sem o processo do npm por cima. O limite de heap (NODE_OPTIONS) vem do compose.
CMD ["sh", "-c", "npm install --no-audit --no-fund && exec node_modules/.bin/vite --host"]
