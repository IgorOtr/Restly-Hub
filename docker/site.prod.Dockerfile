FROM node:22-alpine AS build
WORKDIR /app
COPY site/package*.json ./
RUN npm ci
COPY site .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.site.conf /etc/nginx/conf.d/default.conf
COPY docker/proxy_headers.inc /etc/nginx/conf.d/proxy_headers.inc
EXPOSE 80
