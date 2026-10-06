import './style.css'
import { hydrateIcons } from './icons'

hydrateIcons()

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())))

// ───────────── Topo: transparente sobre o hero, sólido ao rolar ─────────────
const header = document.getElementById('topo')!
const logoDark = header.querySelector<HTMLElement>('[data-logo-dark]')!
const logoLight = header.querySelector<HTMLElement>('[data-logo-light]')!
const nav = header.querySelector<HTMLElement>('[data-nav]')!
const onScroll = () => {
  const solid = window.scrollY > 40
  header.classList.toggle('bg-canvas/90', solid)
  header.classList.toggle('backdrop-blur-lg', solid)
  header.classList.toggle('shadow-sm', solid)
  logoDark.classList.toggle('hidden', solid)
  logoLight.classList.toggle('hidden', !solid)
  nav.classList.toggle('text-white', !solid)
  nav.classList.toggle('text-ink', solid)
}
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// ───────────── Entrada dos blocos ao rolar ─────────────
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible')
        io.unobserve(e.target)
      }
    }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
)
document.querySelectorAll('.reveal').forEach((el, i) => {
  ;(el as HTMLElement).style.transitionDelay = `${(i % 3) * 80}ms`
  io.observe(el)
})

// ───────────── Contato comercial (configurado no Restly Hub) ─────────────
const WHATSAPP_TEXT = 'Olá! Vi o site do Restly e quero saber mais sobre o sistema para o meu restaurante.'

void fetch('/api/public/site/config')
  .then((r) => (r.ok ? r.json() : null))
  .then((c: { whatsapp: string | null; email: string | null } | null) => {
    if (c?.whatsapp) {
      const url = `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(WHATSAPP_TEXT)}`
      document.querySelectorAll<HTMLAnchorElement>('[data-whatsapp]').forEach((a) => {
        a.href = url
        a.classList.remove('hidden')
        if (a.classList.contains('fixed')) a.classList.add('flex')
      })
    }
    const footer = document.querySelector('[data-footer-contact]')
    if (footer && c?.email) footer.innerHTML = `<a class="hover:text-accent" href="mailto:${c.email}">${c.email}</a>`
  })
  .catch(() => undefined)

// ───────────── Formulário de orçamento ─────────────
const form = document.getElementById('lead-form') as HTMLFormElement
const errorBox = document.getElementById('form-error')!
const success = document.getElementById('form-success')!
const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!
const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!
const phone = form.querySelector<HTMLInputElement>('#phone')!

phone.addEventListener('input', () => {
  const d = phone.value.replace(/\D/g, '').slice(0, 11)
  phone.value =
    d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
})

const showError = (msg: string) => {
  errorBox.textContent = msg
  errorBox.classList.remove('hidden')
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errorBox.classList.add('hidden')
  const data = new FormData(form)
  const value = (k: string) => String(data.get(k) ?? '').trim()

  if (value('name').length < 2) return showError('Informe seu nome.')
  if (!/^\d{10,11}$/.test(value('phone').replace(/\D/g, ''))) return showError('Informe um WhatsApp válido com DDD.')
  if (value('restaurantName').length < 2) return showError('Informe o nome do restaurante.')
  if (!data.get('consent')) return showError('Marque a autorização de contato para enviar.')

  submitBtn.disabled = true
  submitLabel.textContent = 'Enviando…'
  try {
    const res = await fetch('/api/public/site/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: value('name'),
        phone: value('phone'),
        email: value('email') || undefined,
        restaurantName: value('restaurantName'),
        city: value('city') || undefined,
        tablesRange: value('tablesRange') || undefined,
        message: value('message') || undefined,
        consent: true,
        website: value('website'),
      }),
    })
    if (res.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos e tente de novo.')
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null
      throw new Error(Array.isArray(body?.message) ? body.message[0] : (body?.message ?? 'Não foi possível enviar. Tente novamente.'))
    }
    form.classList.add('hidden')
    success.classList.remove('hidden')
    success.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Não foi possível enviar. Tente novamente.')
  } finally {
    submitBtn.disabled = false
    submitLabel.textContent = 'Quero meu orçamento gratuito'
  }
})
