<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goHome() {
  router.push("/");
}
</script>

<template>
  <main class="not-found">
    <div class="container">
      <header class="hero">
        <div class="logo">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="18" y="14" width="3" height="3" />
            <rect x="14" y="18" width="3" height="3" />
            <rect x="18" y="18" width="3" height="3" />
          </svg>
        </div>
        <h1>404</h1>
        <p class="subtitle">Page Not Found</p>
      </header>

      <div class="content">
        <p class="message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button class="btn" type="button" @click="goHome">
          Go to Home
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.not-found {
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
  box-shadow: 0 0 40px var(--color-accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

h1 {
  font-size: 4rem;
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
  font-size: 1.25rem;
  font-weight: 500;
}

.content {
  text-align: center;
  width: 100%;
}

.message {
  color: var(--color-text-muted);
  font-size: 1rem;
  margin-bottom: 32px;
  line-height: 1.6;
}

.btn {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-sans);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-accent-shadow);
  background: var(--color-accent-hover);
}
</style>
