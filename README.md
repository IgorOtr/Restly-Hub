# Restly Hub

Painel central dos clientes do [Restly](https://github.com/IgorOtr/Restly): cadastro das instalações e
controle de licença (**Ativo**, **Aviso**, **Bloqueado**). Cada restaurante continua com a sua instalação
independente; o Hub apenas informa, de forma assinada, a situação de cada uma.

- **Backend**: NestJS · Prisma 7 · MySQL 8 · JWT (access + refresh em cookie httpOnly)
- **Frontend**: React 19 · Vite · Tailwind CSS 4 · TanStack Query

## Como funciona

1. Você cadastra o cliente no Hub → é gerada a **chave da instalação** (exibida uma única vez) e as
   variáveis `LICENSE_*` para o `.env` do Restly daquele cliente.
2. A instalação consulta `POST /api/licenses/check` periodicamente, autenticando com a chave.
3. O Hub responde com o status **assinado (Ed25519)**; a instalação valida com a chave pública do Hub.
4. Ao alterar a licença, o Hub chama `POST {instalação}/api/license/refresh` para aplicar na hora
   (se a instalação não responder, ela aplica na próxima consulta).

O protocolo completo está em `docs/licenca.md` no repositório do Restly.

## Rodando com Docker

```bash
cp .env.example .env
docker compose up -d --build
```

- Painel: http://localhost:5174 (no primeiro acesso cria-se o administrador do Hub)
- API: http://localhost:3100/api

## Desenvolvimento local

```bash
docker compose up -d mysql
cd backend && cp .env.example .env && npm install && npx prisma migrate dev && npm run start:dev
cd frontend && npm install && npm run dev
```

## Produção

`docker compose -f docker-compose.prod.yml up -d --build` — exige HTTPS, segredos JWT fortes e,
de preferência, `HUB_SIGNING_PRIVATE_KEY` definida (com backup seguro).

> **Chave de assinatura:** se for perdida ou trocada, todas as instalações deixam de validar as
> respostas do Hub (mantendo o último status) até receberem a nova chave pública.

## Criação automática de instalações

Com a infraestrutura em `infra/` no ar, o Hub cria a instalação de um cliente novo com um clique.

```
servidor das instalações
├── traefik   roteia {cliente}.{domínio}: /api, /uploads e /socket.io → API do cliente; o resto → frontend
├── mysql     um servidor, um banco e um usuário por cliente
├── web       frontend do Restly, único para todos os subdomínios
├── agent     recebe os comandos do Hub e cria/gerencia os containers
└── restly-{cliente}   um container de API por cliente (~110 MB)
```

**Segurança:** o Hub não tem acesso ao Docker. Ele envia comandos ao **agente** autenticados com
HMAC-SHA256 (`AGENT_TOKEN` + horário, válidos por 60 s); o agente valida o identificador, nunca usa shell
e só executa as ações previstas (criar, iniciar, parar, atualizar, sincronizar, remover).

**O que acontece ao criar um cliente** (cerca de 10 segundos): banco e usuário exclusivos, segredos JWT
aleatórios, variáveis de licença, container da API e rota do subdomínio. O Hub devolve um **link de convite**
de uso único (`/setup?token=...`) para o restaurante criar o administrador — sem o convite, ninguém
consegue se cadastrar na instalação recém-criada.

### Subindo a infraestrutura (desenvolvimento local)

```bash
# 1. Imagens do Restly (no repositório do Restly; a versão vem do git)
docker/build-images.sh

# 2. Infra (neste repositório)
cd infra && cp .env.example .env    # defina AGENT_TOKEN e MYSQL_ROOT_PASSWORD
docker compose up -d --build

# 3. No .env do Hub: AGENT_URL=http://host.docker.internal:4000 e o mesmo AGENT_TOKEN
```

As instalações ficam em `http://{cliente}.localhost:8080`.

### Atualizar a versão dos clientes

1. Gere as imagens novas: `docker/build-images.sh` no repositório do Restly
   (em produção: `REGISTRY=ghcr.io/seu-usuario docker/build-images.sh`, que também publica).
2. No Hub: **Clientes → Atualizar plataforma**. Em um clique o agente baixa a versão publicada, atualiza a
   API de cada cliente em execução (pulando quem já está na versão atual; as migrações rodam ao iniciar) e,
   por último, o frontend compartilhado — que agora é gerenciado pelo agente (`restly-web`), não mais pela infra.

### Produção

- DNS curinga `*.seu-dominio` apontando para o servidor.
- `infra/.env`: `BASE_DOMAIN`, `BASE_DOMAIN_REGEX`, `PUBLIC_SCHEME=https`, `PUBLIC_PORT=` (vazio),
  `TLS_ENABLED=true`, `INSTANCE_NODE_ENV=production`, `ACME_EMAIL` e as imagens publicadas em um registro.
- `docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d` (HTTPS automático por subdomínio).
  **Esta configuração de TLS ainda não foi validada em servidor real.**
- Backups: o banco de cada cliente (`restly_{cliente}`) e o volume `restly-{cliente}_uploads`.

## Funcionalidades

- Login com verificação em duas etapas (TOTP — Google Authenticator, Authy, 1Password), com códigos de recuperação. Ative em **Configurações → Segurança**. Em produção defina `TOTP_ENCRYPTION_KEY` (não troque depois de ativar)

- Clientes: cadastro, dados comerciais (mensalidade, vencimento), encerrar/reativar
- Instalações: criação automática, link de convite, parar/iniciar, atualizar versão (individual ou todas de uma vez) e remover preservando os dados (com recriação reaproveitando banco e arquivos)
- Encerrar cliente bloqueia e para a instalação; reativar volta a iniciá-la (ainda bloqueada)
- Contato de suporte geral, com opção de um contato específico por cliente
- Licença: liberar, colocar em aviso (com prazo) e bloquear, com motivo e mensagem; histórico completo
- Monitoramento: última comunicação, versão e IP de cada instalação; alerta de instalações sem comunicação
- Configurações: contato de suporte exibido aos clientes e dados de integração (URL e chave pública)

## Testes

```bash
cd backend && npm test
```
