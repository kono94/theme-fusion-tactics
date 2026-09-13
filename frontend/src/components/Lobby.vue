<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'GameLobby'
})

const props = withDefaults(defineProps<{
  title: string
  themeClass?: string
  error?: string
}>(), {
  themeClass: 'theme-generic',
})

const joinId = ref('')

defineEmits<{
    create: []
    join: [roomId: string]
}>()
</script>

<template>
  <div :class="['lobby', props.themeClass]">
    <div class="title">
        <h1>{{ props.title }}</h1>
        <p class="subtitle">Create or join a tactics room</p>
    </div>
    <div v-if="props.error" class="lobby-error">{{ props.error }}</div>
    
    <div class="actions">
       <div class="card">
         <h3>Create New Room</h3>
         <p>Get a generated room code and invite other players</p>
         <button @click="$emit('create')">Create Game</button>
       </div>
       
       <div class="separator">OR</div>

       <div class="card">
         <h3>Join Existing Room</h3>
         <p>Play with others</p>
         <input v-model="joinId" placeholder="Enter Room ID" @keyup.enter="joinId && $emit('join', joinId)" />
         <button @click="$emit('join', joinId)" :disabled="!joinId" class="secondary">Join Game</button>
       </div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 50px;
    color: var(--room-fg);
    background: var(--room-bg);
    min-height: 100vh;
    overflow: hidden;
}

.lobby > * {
    position: relative;
    z-index: 1;
}

.title h1 {
    font-size: 3em;
    margin-bottom: 10px;
    background: linear-gradient(to right, var(--room-accent), #ff8c00);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.title {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.subtitle {
    margin: 0;
    color: var(--room-muted);
    font-size: 1.05rem;
    font-weight: 600;
}

.actions {
    display: flex;
    gap: 40px;
    align-items: center;
    margin-top: 50px;
}

.lobby-error {
    margin-top: 20px;
    padding: 10px 14px;
    border-radius: 6px;
    background: rgba(239, 68, 68, 0.16);
    border: 1px solid rgba(248, 113, 113, 0.5);
    color: #fecaca;
    font-weight: 600;
}

.card {
    background: rgba(255, 255, 255, 0.1);
    padding: 30px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 300px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

input {
    padding: 10px;
    border-radius: 6px;
    border: none;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    font-size: 16px;
}

button {
    padding: 12px;
    border-radius: 6px;
    border: none;
    background: var(--room-accent);
    color: var(--room-accent-contrast);
    font-weight: bold;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover:not(:disabled) {
    transform: scale(1.05);
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

button.secondary {
    background: #4ade80;
    color: #0f172a;
}

.separator {
    font-weight: bold;
    color: #888;
}

@media (max-width: 720px) {
    .actions {
        flex-direction: column;
        gap: 18px;
        width: min(92vw, 340px);
        margin-top: 32px;
    }

    .card {
        width: 100%;
    }

}

@media (prefers-reduced-motion: reduce) {
    .lobby *,
    .lobby *::before,
    .lobby *::after {
        transition-duration: 0.01ms !important;
    }
}
</style>
