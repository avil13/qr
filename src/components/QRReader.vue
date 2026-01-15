<script setup lang="ts">
import { QRCodeReader } from "@/lib";
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";

const isDragOver = ref(false);
const isLoading = ref(false);
const previewUrl = ref<string | null>(null);
const result = ref<string | null>(null);
const error = ref<string | null>(null);

const isCameraActive = ref(false);
const stream = ref<MediaStream | null>(null);
const capturedImageUrl = ref<string | null>(null);
const capturedFile = ref<File | null>(null);

const fileInput = useTemplateRef("fileInput");
const previewRef = useTemplateRef("previewRef");
const videoRef = useTemplateRef("videoRef");

const isHideUnnecessary = computed<boolean>(() => {
  return !result.value && !isCameraActive.value && !capturedImageUrl.value;
});

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
    const file = files[0];
    if (file) {
      handleFile(file);
    }
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file) {
      handleFile(file);
    }
  }
}

async function handleFile(file: File) {
  if (!file.type.startsWith("image/")) {
    error.value = "Please select an image file";
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
    error.value = err instanceof Error ? err.message : "Failed to decode QR code";
  } finally {
    isLoading.value = false;
  }
}

function reset() {
  previewUrl.value = null;
  result.value = null;
  error.value = null;
  isLoading.value = false;
  stopCamera();
  if (capturedImageUrl.value) {
    URL.revokeObjectURL(capturedImageUrl.value);
    capturedImageUrl.value = null;
  }
  capturedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

async function handlePaste(e: ClipboardEvent) {
  e.preventDefault();

  const items = e.clipboardData?.items;
  if (!items) return;

  // Ищем изображение в буфере обмена
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        handleFile(file);
        return;
      }
    }
  }
}

async function startCamera() {
  // Проверка поддержки API
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    error.value = "Camera is not supported in this browser";
    return;
  }

  try {
    // Запрос доступа к камере (задняя камера на мобильных)
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    stream.value = mediaStream;
    isCameraActive.value = true;
    error.value = null;

    // Присваиваем поток видео элементу после следующего тика
    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream;
      videoRef.value.play().catch((err) => {
        console.error("Error playing video:", err);
      });
    }
  } catch (err) {
    isCameraActive.value = false;
    if (err instanceof Error) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        error.value = "Camera access denied. Please allow camera access and try again.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        error.value = "No camera found on this device.";
      } else {
        error.value = `Failed to access camera: ${err.message}`;
      }
    } else {
      error.value = "Failed to access camera";
    }
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }
  isCameraActive.value = false;
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
}

async function capturePhoto() {
  if (!videoRef.value || !isCameraActive.value) return;

  const video = videoRef.value;
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    error.value = "Video stream is not ready";
    return;
  }

  try {
    // Создаем canvas и рисуем кадр из видео
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      error.value = "Failed to create canvas context";
      return;
    }

    ctx.drawImage(video, 0, 0);

    // Конвертируем canvas в Blob, затем в File
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/jpeg",
        0.95
      );
    });

    const file = new File([blob], `capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    // Создаем URL для предпросмотра
    capturedImageUrl.value = URL.createObjectURL(blob);
    capturedFile.value = file;

    // Останавливаем камеру после захвата
    stopCamera();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to capture photo";
  }
}

function useCapturedPhoto() {
  if (capturedFile.value) {
    handleFile(capturedFile.value);
    capturedImageUrl.value = null;
    capturedFile.value = null;
  }
}

function cancelCapture() {
  if (capturedImageUrl.value) {
    URL.revokeObjectURL(capturedImageUrl.value);
    capturedImageUrl.value = null;
  }
  capturedFile.value = null;
  // Возвращаемся к камере
  startCamera();
}

// Плавный скролл до preview при появлении результата
watch(result, async (newValue) => {
  if (newValue && previewRef.value) {
    // Ждем следующего тика, чтобы элемент был полностью отрендерен
    await new Promise((r) => {
      setTimeout(r, 450);
    });
    previewRef.value.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
});

onMounted(() => {
  // Добавляем глобальный обработчик paste
  window.addEventListener("paste", handlePaste);
});

onUnmounted(() => {
  // Удаляем обработчик при размонтировании компонента
  window.removeEventListener("paste", handlePaste);
  // Останавливаем камеру и освобождаем ресурсы
  stopCamera();
  if (capturedImageUrl.value) {
    URL.revokeObjectURL(capturedImageUrl.value);
  }
});
</script>

<template>
  <div class="qr-reader">
    <div
      v-if="!result"
      class="upload-area"
      :class="{
        dragover: isDragOver,
        'has-result': !!result,
        'camera-active': isCameraActive || !!capturedImageUrl,
      }"
      @click="!isCameraActive && !capturedImageUrl && triggerFileInput()"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div v-if="!result" class="upload-icon">
        <svg
          width="64"
          height="64"
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
      <p v-if="isHideUnnecessary" class="upload-text">Drag & drop a QR code image here</p>
      <p v-if="isHideUnnecessary" class="upload-text-secondary">or</p>
      <div v-if="isHideUnnecessary" class="button-group">
        <button class="btn" type="button" @click.stop="triggerFileInput">Choose File</button>
        <button class="btn btn-camera" type="button" @click.stop="startCamera">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="margin-right: 6px"
          >
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Use Camera
        </button>
      </div>
      <p v-if="isHideUnnecessary" class="upload-text-secondary">or press Ctrl+V / Cmd+V to paste</p>
      <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" />

      <!-- Camera Preview -->
      <div v-if="isCameraActive && !capturedImageUrl" class="camera-preview">
        <video ref="videoRef" autoplay playsinline></video>
        <div class="camera-controls">
          <button class="btn btn-capture" type="button" @click.stop="capturePhoto">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" fill="currentColor" />
            </svg>
          </button>
          <button class="btn btn-secondary" type="button" @click.stop="stopCamera">Cancel</button>
        </div>
      </div>

      <!-- Captured Image Preview -->
      <div v-if="capturedImageUrl" class="captured-preview">
        <img :src="capturedImageUrl" alt="Captured photo" />
        <div class="captured-controls">
          <button class="btn btn-secondary" type="button" @click.stop="cancelCapture">
            Retake
          </button>
          <button class="btn" type="button" @click.stop="useCapturedPhoto">Use Photo</button>
        </div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="previewUrl" ref="previewRef" class="preview">
        <div class="preview-header">
          <span>Preview</span>
          <button class="btn-reset" type="button" @click="reset">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Decoded Successfully
          </div>
          <div class="result-text">{{ result }}</div>
          <button class="btn-copy" type="button" @click="copyToClipboard(result)">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </button>
        </div>

        <div v-else-if="error" class="result error">
          <div class="result-label">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
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
  transition: all 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--color-surface);
}

.upload-area.has-result {
  padding-top: 8px;
  padding-bottom: 8px;
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
  margin-top: 16px;
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
  font-family: "JetBrains Mono", "Fira Code", monospace;
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

.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-camera {
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-preview {
  margin-top: 16px;
  width: 100%;
}

.camera-preview video {
  width: 100%;
  max-height: 400px;
  border-radius: 12px;
  background: var(--color-bg);
  object-fit: contain;
}

.camera-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  align-items: center;
}

.btn-capture {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: var(--color-text-on-accent);
  border: 4px solid var(--color-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-capture:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px var(--color-accent-shadow);
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.captured-preview {
  margin-top: 16px;
  width: 100%;
}

.captured-preview img {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.captured-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 480px) {
  .button-group {
    flex-direction: column;
  }

  .button-group .btn {
    width: 100%;
  }

  .camera-controls {
    flex-direction: column;
  }

  .captured-controls {
    flex-direction: column;
  }

  .captured-controls .btn,
  .camera-controls .btn-secondary {
    width: 100%;
  }
}
</style>
