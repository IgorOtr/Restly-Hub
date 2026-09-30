# Agente de provisionamento: Docker CLI (com compose) + Node.
FROM docker:27-cli
RUN apk add --no-cache nodejs
WORKDIR /agent
COPY agent/server.mjs .
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 4000
# ENTRYPOINT próprio: a imagem base encaminharia o comando para o binário docker.
ENTRYPOINT ["node", "server.mjs"]
