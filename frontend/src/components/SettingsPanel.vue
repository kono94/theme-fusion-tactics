<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ClientSettings } from '../utils/clientSettings'

const props = defineProps<{
  settings: ClientSettings
  combat3dUnavailable?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  'update-settings': [settings: ClientSettings]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function toggle3d(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  emit('update-settings', { ...props.settings, combatView: enabled ? '3d' : 'classic' })
}

function onDocumentPointer(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('pointerdown', onDocumentPointer)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointer)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointer)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="settings" :class="{ compact }">
    <button
      class="settings-trigger"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open"
      aria-label="Settings"
      title="Settings"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.43-2.53a7.8 7.8 0 0 0 0-1.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.5 7.5 0 0 0-1.68-.97l-.36-2.54A.5.5 0 0 0 14.13 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.6.24-1.17.57-1.68.97l-2.39-.96a.5.5 0 0 0-.61.22L2.84 8.51a.5.5 0 0 0 .12.64l2.03 1.58a7.8 7.8 0 0 0 0 1.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.51.4 1.08.73 1.68.97l.36 2.54c.04.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.6-.24 1.17-.57 1.68-.97l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58Z"
        />
      </svg>
      <span v-if="!compact">Settings</span>
    </button>

    <div v-if="open" class="settings-panel" role="dialog" aria-label="Settings">
      <h2>Settings</h2>
      <label class="setting-row">
        <span class="setting-text">
          <span class="setting-title">
            3D battle view
            <span class="preview-badge">Preview</span>
          </span>
          <span class="setting-hint">
            Watch combat in a 3D arena themed to the game mode. Planning stays on the classic board.
            This view is still changing and falls back to Classic if your device can't show 3D.
          </span>
          <span v-if="combat3dUnavailable" class="setting-warning">
            3D isn't available on this device right now, so combat is shown in Classic.
          </span>
        </span>
        <input
          class="switch"
          type="checkbox"
          role="switch"
          :checked="settings.combatView === '3d'"
          @change="toggle3d"
        />
      </label>
    </div>
  </div>
</template>

<style scoped>
.settings {
  position: relative;
}

.settings-trigger {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 5px 8px;
  border: 1px solid rgba(251, 191, 36, 0.34);
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.76);
  color: #fde68a;
  font-family: 'Courier New', monospace;
  font-size: 0.66rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.settings-trigger:hover,
.settings-trigger[aria-expanded='true'] {
  border-color: rgba(251, 191, 36, 0.68);
  background: rgba(30, 41, 59, 0.92);
  color: #fef3c7;
}

.settings-trigger svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.compact .settings-trigger {
  padding: 4px;
}

.compact .settings-trigger svg {
  width: 16px;
  height: 16px;
}

.settings-panel {
  position: absolute;
  z-index: 10001;
  bottom: calc(100% + 8px);
  left: 0;
  width: min(320px, calc(100vw - 32px));
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.97);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  color: #e2e8f0;
  text-align: left;
}

.compact .settings-panel {
  top: calc(100% + 8px);
  bottom: auto;
}

h2 {
  margin: 0 0 10px;
  font-size: 0.95rem;
}

.setting-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  cursor: pointer;
}

.setting-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.setting-title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.preview-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: #f59e0b;
  color: #1c1917;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.setting-hint {
  color: #94a3b8;
  font-size: 0.75rem;
  line-height: 1.35;
}

.setting-warning {
  color: #fbbf24;
  font-size: 0.75rem;
}

.switch {
  appearance: none;
  position: relative;
  flex: none;
  width: 38px;
  height: 22px;
  margin: 2px 0 0;
  border-radius: 999px;
  background: #334155;
  cursor: pointer;
  transition: background 0.2s ease;
}

.switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f8fafc;
  transition: transform 0.2s ease;
}

.switch:checked {
  background: #f59e0b;
}

.switch:checked::after {
  transform: translateX(16px);
}

.switch:focus-visible {
  outline: 2px solid #fde68a;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .switch,
  .switch::after {
    transition: none;
  }
}
</style>
