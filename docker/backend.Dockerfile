FROM node:22-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 3100
# npm install na subida: dependências novas entram sem reconstruir a imagem.
# SWC no modo watch (bem mais leve que o tsc; a checagem de tipos fica no editor/CI) e
# exec: sem o processo do npm por cima.
CMD ["sh", "-c", "npm install --no-audit --no-fund && npx prisma migrate deploy && exec node_modules/.bin/nest start --watch -b swc"]
