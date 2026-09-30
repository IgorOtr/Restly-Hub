// Restly Agent — executa, no servidor das instalações, os comandos autenticados pelo Hub.
// Sem dependências: Node + Docker CLI. Nunca usa shell (execFile com argumentos).
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const env = (k, d) => process.env[k] ?? d
const cfg = {
  port: Number(env('PORT', 4000)),
  token: env('AGENT_TOKEN', ''),
  domain: env('BASE_DOMAIN', 'localhost'),
  scheme: env('PUBLIC_SCHEME', 'http'),
  publicPort: env('PUBLIC_PORT', ''),
  tls: env('TLS_ENABLED', 'false') === 'true',
  backendImage: env('RESTLY_BACKEND_IMAGE', 'restly-backend:local'),
  mysqlContainer: env('MYSQL_CONTAINER', 'restly-infra-mysql'),
  mysqlHost: env('MYSQL_HOST', 'restly-mysql'),
  mysqlRootPassword: env('MYSQL_ROOT_PASSWORD', ''),
  dataDir: env('DATA_DIR', '/data'),
  network: env('EDGE_NETWORK', 'restly-edge'),
  nodeEnv: env('INSTANCE_NODE_ENV', 'production'),
  memLimit: env('INSTANCE_MEM_LIMIT', '384m'),
  nodeFlags: env('INSTANCE_NODE_FLAGS', '--max-old-space-size=256'),
  checkInterval: env('LICENSE_CHECK_INTERVAL_SECONDS', '300'),
  tz: env('TZ', 'America/Sao_Paulo'),
}
if (cfg.token.length < 32) {
  console.error('AGENT_TOKEN ausente ou curto (mínimo 32 caracteres).')
  process.exit(1)
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/
const MAX_SKEW_MS = 60_000
const log = (...a) => console.log(new Date().toISOString(), ...a)

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 180_000, maxBuffer: 4 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).toString().trim().slice(-600)))
      else resolve(stdout.toString())
    })
  })
}

const names = (slug) => ({
  container: `restly-${slug}`,
  project: `restly-${slug}`,
  dir: path.join(cfg.dataDir, 'instances', slug),
  db: `restly_${slug.replace(/-/g, '_')}`,
  host: `${slug}.${cfg.domain}`,
  url: `${cfg.scheme}://${slug}.${cfg.domain}${cfg.publicPort ? `:${cfg.publicPort}` : ''}`,
})

const mysql = (sql) =>
  run('docker', ['exec', '-e', `MYSQL_PWD=${cfg.mysqlRootPassword}`, cfg.mysqlContainer, 'mysql', '-uroot', '-N', '-e', sql])

const secret = (bytes = 48) => randomBytes(bytes).toString('base64url')

function composeFile(slug) {
  const n = names(slug)
  const router = `traefik.http.routers.${n.project}`
  const labels = [
    'traefik.enable=true',
    `traefik.docker.network=${cfg.network}`,
    // Só as rotas de API vão para a instalação; o restante é servido pelo frontend compartilhado.
    `${router}.rule=Host(\`${n.host}\`) && (PathPrefix(\`/api\`) || PathPrefix(\`/uploads\`) || PathPrefix(\`/socket.io\`))`,
    `${router}.priority=100`,
    `${router}.entrypoints=${cfg.tls ? 'websecure' : 'web'}`,
    ...(cfg.tls ? [`${router}.tls.certresolver=le`] : []),
    `traefik.http.services.${n.project}.loadbalancer.server.port=3000`,
  ]
  return `services:
  backend:
    image: ${cfg.backendImage}
    container_name: ${n.container}
    restart: unless-stopped
    env_file: [.env]
    mem_limit: ${cfg.memLimit}
    volumes:
      - uploads:/app/uploads
    networks: [edge]
    labels:
${labels.map((l) => `      - ${JSON.stringify(l)}`).join('\n')}
volumes:
  uploads:
networks:
  edge:
    external: true
    name: ${cfg.network}
`
}

const compose = (slug, ...args) => {
  const n = names(slug)
  return run('docker', ['compose', '-p', n.project, '-f', path.join(n.dir, 'compose.yml'), ...args], { cwd: n.dir })
}

async function exists(slug) {
  return fs.access(path.join(names(slug).dir, '.env')).then(
    () => true,
    () => false,
  )
}

async function status(slug) {
  const n = names(slug)
  if (!(await exists(slug))) return { provisioned: false }
  const raw = await run('docker', ['inspect', '--format', '{{.State.Status}}|{{.Config.Image}}|{{.State.StartedAt}}', n.container]).catch(() => '')
  const [state, image, startedAt] = raw.trim().split('|')
  return { provisioned: true, state: state || 'missing', image: image || null, startedAt: startedAt || null, url: n.url }
}

async function waitHealthy(slug, seconds = 120) {
  const n = names(slug)
  const deadline = Date.now() + seconds * 1000
  let last = ''
  while (Date.now() < deadline) {
    try {
      await run('docker', ['exec', n.container, 'wget', '-qO-', 'http://localhost:3000/api/auth/setup-status'], { timeout: 8000 })
      return
    } catch (e) {
      last = e.message
      await new Promise((r) => setTimeout(r, 2500))
    }
  }
  const logs = await run('docker', ['logs', '--tail', '15', n.container]).catch(() => '')
  throw new Error(`A instalação não respondeu a tempo. ${last}\n${logs.slice(-500)}`)
}

/** Cria banco, usuário, segredos e sobe o container da instalação. */
async function provision(body) {
  const { slug, license, setupToken } = body
  const n = names(slug)
  if (await exists(slug)) throw new HttpError(409, 'Instalação já existe neste servidor')
  for (const k of ['hubUrl', 'instanceId', 'instanceKey', 'hubPublicKey'])
    if (typeof license?.[k] !== 'string' || !license[k]) throw new HttpError(400, `license.${k} é obrigatório`)
  if (typeof setupToken !== 'string' || setupToken.length < 24) throw new HttpError(400, 'setupToken inválido')

  log('provision', slug)
  const dbPassword = randomBytes(24).toString('hex')
  // Identificadores vêm do slug já validado ([a-z0-9-]); a senha é hexadecimal.
  await mysql(
    `CREATE DATABASE IF NOT EXISTS \`${n.db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     CREATE USER IF NOT EXISTS '${n.db}'@'%' IDENTIFIED BY '${dbPassword}';
     ALTER USER '${n.db}'@'%' IDENTIFIED BY '${dbPassword}';
     GRANT ALL PRIVILEGES ON \`${n.db}\`.* TO '${n.db}'@'%';
     FLUSH PRIVILEGES;`,
  )

  const vars = {
    ...(cfg.nodeEnv !== 'production' && { NODE_ENV: cfg.nodeEnv }),
    PORT: '3000',
    TZ: cfg.tz,
    DATABASE_URL: `mysql://${n.db}:${dbPassword}@${cfg.mysqlHost}:3306/${n.db}?allowPublicKeyRetrieval=true&connectionLimit=5`,
    JWT_ACCESS_SECRET: secret(),
    JWT_REFRESH_SECRET: secret(),
    JWT_CUSTOMER_SECRET: secret(),
    JWT_ACCESS_EXPIRES_IN: '15m',
    REFRESH_TOKEN_DAYS: '7',
    CORS_ORIGIN: n.url,
    PUBLIC_APP_URL: n.url,
    TRUST_PROXY: '1',
    COOKIE_SECURE: String(cfg.tls),
    NODE_FLAGS: cfg.nodeFlags,
    SETUP_TOKEN: setupToken,
    LICENSE_HUB_URL: license.hubUrl,
    LICENSE_INSTANCE_ID: license.instanceId,
    LICENSE_INSTANCE_KEY: license.instanceKey,
    LICENSE_HUB_PUBLIC_KEY: license.hubPublicKey,
    LICENSE_CHECK_INTERVAL_SECONDS: cfg.checkInterval,
  }
  await fs.mkdir(n.dir, { recursive: true, mode: 0o700 })
  await fs.writeFile(path.join(n.dir, '.env'), Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 })
  await fs.writeFile(path.join(n.dir, 'compose.yml'), composeFile(slug), { mode: 0o600 })

  try {
    await compose(slug, 'up', '-d')
    await waitHealthy(slug)
  } catch (e) {
    // Falhou: remove o container e a configuração (o banco vazio é mantido para diagnóstico).
    await compose(slug, 'down').catch(() => undefined)
    await fs.rm(n.dir, { recursive: true, force: true })
    throw new HttpError(500, e.message)
  }
  log('provisioned', slug, n.url)
  return { url: n.url, setupUrl: `${n.url}/setup?token=${encodeURIComponent(setupToken)}`, ...(await status(slug)) }
}

async function requireInstance(slug) {
  if (!(await exists(slug))) throw new HttpError(404, 'Instalação não encontrada neste servidor')
}

const actions = {
  async start(slug) {
    await compose(slug, 'up', '-d')
    await waitHealthy(slug)
  },
  async stop(slug) {
    await compose(slug, 'stop')
  },
  /** Recria o container com a imagem configurada no agente (atualização de versão). */
  async redeploy(slug) {
    await fs.writeFile(path.join(names(slug).dir, 'compose.yml'), composeFile(slug), { mode: 0o600 })
    await compose(slug, 'pull').catch(() => undefined) // imagens locais não têm registro
    await compose(slug, 'up', '-d')
    await waitHealthy(slug)
  },
  /**
   * Remove o container e a configuração da instalação. O banco de dados e os
   * arquivos enviados (volume) são preservados para backup/restauração.
   */
  async remove(slug) {
    await compose(slug, 'down')
    await fs.rm(names(slug).dir, { recursive: true, force: true })
  },
  /** Pede à instalação que consulte a licença agora (rede interna, sem passar pela internet). */
  async sync(slug) {
    await run('docker', ['exec', names(slug).container, 'wget', '-qO-', '--post-data=', 'http://localhost:3000/api/license/refresh'], { timeout: 10_000 })
  },
}

// ─────────────────────────── HTTP ───────────────────────────

function authenticate(req, body) {
  const ts = Number(req.headers['x-agent-timestamp'])
  const sig = String(req.headers['x-agent-signature'] ?? '')
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > MAX_SKEW_MS) throw new HttpError(401, 'Requisição expirada')
  const expected = createHmac('sha256', cfg.token).update(`${ts}.${req.method}.${req.url}.${body}`).digest()
  const received = Buffer.from(sig, 'hex')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new HttpError(401, 'Assinatura inválida')
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 64_000) reject(new HttpError(413, 'Payload muito grande'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })

// Uma operação por instalação de cada vez.
const locks = new Map()
const withLock = async (slug, fn) => {
  if (locks.has(slug)) throw new HttpError(409, 'Já existe uma operação em andamento para esta instalação')
  locks.set(slug, true)
  try {
    return await fn()
  } finally {
    locks.delete(slug)
  }
}

async function route(req, raw) {
  const url = new URL(req.url, 'http://agent')
  const parts = url.pathname.split('/').filter(Boolean)
  const body = raw ? JSON.parse(raw) : {}

  if (req.method === 'GET' && url.pathname === '/health')
    return { ok: true, domain: cfg.domain, scheme: cfg.scheme, publicPort: cfg.publicPort, backendImage: cfg.backendImage, tls: cfg.tls }

  if (parts[0] !== 'instances') throw new HttpError(404, 'Rota não encontrada')
  const slug = parts[1] ?? body.slug
  if (typeof slug !== 'string' || !SLUG.test(slug)) throw new HttpError(400, 'Identificador inválido')

  if (req.method === 'POST' && parts.length === 1) return withLock(slug, () => provision(body))
  if (req.method === 'GET' && parts.length === 2) return status(slug)
  if (req.method === 'POST' && parts.length === 3 && actions[parts[2]]) {
    await requireInstance(slug)
    return withLock(slug, async () => {
      log(parts[2], slug)
      await actions[parts[2]](slug)
      return status(slug)
    })
  }
  throw new HttpError(404, 'Rota não encontrada')
}

http
  .createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    }
    try {
      const raw = await readBody(req)
      authenticate(req, raw)
      send(200, await route(req, raw))
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500
      if (status >= 500) log('erro', req.method, req.url, e.message)
      send(status, { message: e.message })
    }
  })
  .listen(cfg.port, () => log(`Restly Agent em :${cfg.port} (domínio ${cfg.domain}, imagem ${cfg.backendImage})`))
