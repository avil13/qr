<script setup lang="ts">
import QRReader from '@/components/QRReader.vue';
</script>

<template>
  <main class="home">
    <div class="container">
      <header class="hero">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="18" y="14" width="3" height="3" />
            <rect x="14" y="18" width="3" height="3" />
            <rect x="18" y="18" width="3" height="3" />
          </svg>
        </div>
        <h1>QR Scanner</h1>
        <p class="subtitle">Zero-dependency QR code decoder built with TypeScript</p>
      </header>

      <QRReader />

      <footer class="footer">
        <p>Drop any image containing a QR code to decode it instantly</p>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 560px;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  margin-bottom: 24px;
  color: var(--color-accent);
  box-shadow:
    0 0 40px var(--color-accent-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--color-text) 0%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--color-text-muted);
  font-size: 1rem;
  max-width: 320px;
  margin: 0 auto;
}

.footer {
  margin-top: 40px;
  text-align: center;
}

.footer p {
  color: var(--color-text-muted);
  font-size: 13px;
  opacity: 0.7;
}
</style>
