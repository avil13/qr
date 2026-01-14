import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// GitHub Pages SPA fallback:
// public/404.html redirects unknown paths to /qr/?p=<encoded original path>.
// Restore the original route before Vue Router initializes.
const params = new URLSearchParams(window.location.search)
const p = params.get('p')
if (p) {
  const baseUrl = import.meta.env.BASE_URL
  const baseNoSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  let decoded = ''
  try {
    decoded = decodeURIComponent(p)
  } catch {
    decoded = p
  }
  if (!decoded.startsWith('/')) decoded = `/${decoded}`

  window.history.replaceState(null, '', `${baseNoSlash}${decoded}`)
}

const app = createApp(App)

app.use(router)

app.mount('#app')
