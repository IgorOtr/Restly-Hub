FROM node:22-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host"]
