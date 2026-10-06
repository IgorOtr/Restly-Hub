import './style.css'

// ───────────── Ícones (traços do Lucide, embutidos para não carregar biblioteca) ─────────────
const ICONS: Record<string, string> = {
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  notebook:
    '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  boxes:
    '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>',
  'trending-down': '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'qr-code':
    '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  'chef-hat':
    '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  'bar-chart': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/>',
  'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
}

document.querySelectorAll<SVGElement>('svg[data-icon]').forEach((svg) => {
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = ICONS[svg.dataset.icon ?? ''] ?? ''
})

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())))

// ───────────── Topo: transparente sobre o hero, sólido ao rolar ─────────────
const header = document.getElementById('topo')!
const logoDark = header.querySelector<HTMLElement>('[data-logo-dark]')!
const logoLight = header.querySelector<HTMLElement>('[data-logo-light]')!
const nav = header.querySelector<HTMLElement>('[data-nav]')!
const onScroll = () => {
  const solid = window.scrollY > 40
  header.classList.toggle('bg-cream/90', solid)
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
    if (footer && c?.email) footer.innerHTML = `<a class="hover:text-ember" href="mailto:${c.email}">${c.email}</a>`
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
