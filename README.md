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

## Funcionalidades

- Clientes: cadastro, dados comerciais (mensalidade, vencimento), encerrar/reativar
- Licença: liberar, colocar em aviso (com prazo) e bloquear, com motivo e mensagem; histórico completo
- Monitoramento: última comunicação, versão e IP de cada instalação; alerta de instalações sem comunicação
- Configurações: contato de suporte exibido aos clientes e dados de integração (URL e chave pública)

## Testes

```bash
cd backend && npm test
```
