FROM node:22-alpine
WORKDIR /app
COPY site/package*.json ./
RUN npm install
COPY site .
EXPOSE 5175
# npm install na subida: dependências novas entram sem reconstruir a imagem.
CMD ["sh", "-c", "npm install --no-audit --no-fund && exec node_modules/.bin/vite --host"]
