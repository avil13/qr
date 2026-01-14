<script setup lang="ts">
import { ref } from 'vue';
import { QRCodeReader } from '@/lib/qr-reader';

const isDragOver = ref(false);
const isLoading = ref(false);
const previewUrl = ref<string | null>(null);
const result = ref<string | null>(null);
const error = ref<string | null>(null);

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    handleFile(target.files[0]);
  }
}

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file';
    result.value = null;
    return;
  }

  // Reset state
  error.value = null;
  result.value = null;
  isLoading.value = true;

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // Decode QR
  try {
    const qrReader = new QRCodeReader();
    const decoded = await qrReader.read(file);
    result.value = decoded;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to decode QR code';
  } finally {
    isLoading.value = false;
  }
}

function reset() {
  previewUrl.value = null;
  result.value = null;
  error.value = null;
  isLoading.value = false;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}
</script>

<template>
  <div class="qr-reader">
    <div
      class="upload-area"
      :class="{ dragover: isDragOver }"
      @click="triggerFileInput"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="upload-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="3" height="3" />
          <rect x="18" y="14" width="3" height="3" />
          <rect x="14" y="18" width="3" height="3" />
          <rect x="18" y="18" width="3" height="3" />
        </svg>
      </div>
      <p class="upload-text">Drag & drop a QR code image here</p>
      <p class="upload-text-secondary">or</p>
      <button class="btn" type="button" @click.stop="triggerFileInput">
        Choose File
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="handleFileSelect"
      />
    </div>

    <Transition name="fade">
      <div v-if="previewUrl" class="preview">
        <div class="preview-header">
          <span>Preview</span>
          <button class="btn-reset" type="button" @click="reset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Clear
          </button>
        </div>
        <img :src="previewUrl" alt="QR Code Preview" />

        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <span>Decoding QR Code...</span>
        </div>

        <div v-else-if="result" class="result success">
          <div class="result-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Decoded Successfully
          </div>
          <div class="result-text">{{ result }}</div>
          <button class="btn-copy" type="button" @click="navigator.clipboard.writeText(result)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </button>
        </div>

        <div v-else-if="error" class="result error">
          <div class="result-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Error
          </div>
          <div class="result-text">{{ error }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.qr-reader {
  width: 100%;
  max-width: 500px;
}

.upload-area {
  border: 2px dashed var(--color-border);
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--color-surface);
}

.upload-area:hover {
  border-color: var(--color-accent);
  background: var(--color-surface-hover);
}

.upload-area.dragover {
  border-color: var(--color-accent);
  background: var(--color-surface-active);
  transform: scale(1.01);
}

.upload-icon {
  color: var(--color-accent);
  margin-bottom: 16px;
  opacity: 0.8;
}

.upload-text {
  color: var(--color-text);
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.upload-text-secondary {
  color: var(--color-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}

input[type="file"] {
  display: none;
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
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-accent-shadow);
}

.preview {
  margin-top: 24px;
  background: var(--color-surface);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.preview img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  color: var(--color-accent);
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  position: relative;
}

.result.success {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
}

.result.error {
  background: var(--color-error-bg);
  border: 1px solid var(--color-error-border);
}

.result-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.result.success .result-label {
  color: var(--color-success);
}

.result.error .result-label {
  color: var(--color-error);
}

.result-text {
  color: var(--color-text);
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 12px;
  background: var(--color-bg);
  border-radius: 8px;
}

.btn-copy {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
