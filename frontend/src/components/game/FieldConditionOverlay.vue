<script setup lang="ts">
import { computed } from 'vue'
import { prefersReducedMotion } from '../../animations/renderPolicy'
import { fieldConditionVisual, type FieldConditionVisual } from '../../utils/fieldConditions'

const props = defineProps<{
  conditionId: string | null
}>()

const PARTICLES: Record<FieldConditionVisual, { count: number; seconds: number }> = {
  rain: { count: 36, seconds: 0.9 },
  sun: { count: 14, seconds: 7 },
  sand: { count: 26, seconds: 2.6 },
  hail: { count: 22, seconds: 1.6 },
}

const visual = computed(() => fieldConditionVisual(props.conditionId))
const reducedMotion = prefersReducedMotion()

// A fixed golden-ratio spread keeps the particle layout stable between renders without randomness.
const particles = computed(() => {
  if (!visual.value || reducedMotion) return []
  const { count, seconds } = PARTICLES[visual.value]
  return Array.from({ length: count }, (_, index) => {
    const spread = (index * 0.618034) % 1
    return {
      id: index,
      style: {
        left: `${(spread * 100).toFixed(2)}%`,
        top: `${(((index * 0.381966) % 1) * 100).toFixed(2)}%`,
        animationDelay: `${(-((index * 0.73) % 1) * seconds).toFixed(2)}s`,
        animationDuration: `${(seconds * (0.85 + spread * 0.6)).toFixed(2)}s`,
      },
    }
  })
})
</script>

<template>
  <div
    v-if="visual"
    class="field-overlay"
    :class="[`field-${visual}`, { 'reduced-motion': reducedMotion }]"
    data-testid="field-condition-overlay"
    aria-hidden="true"
  >
    <span
      v-for="particle in particles"
      :key="particle.id"
      class="particle"
      :style="particle.style"
    ></span>
  </div>
</template>

<style scoped>
.field-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
}

.field-overlay.reduced-motion.field-rain {
  background: rgb(56 189 248 / 5%);
}

.field-overlay.reduced-motion.field-sun {
  background: rgb(251 191 36 / 5%);
}

.field-overlay.reduced-motion.field-sand {
  background: rgb(214 170 104 / 6%);
}

.field-overlay.reduced-motion.field-hail {
  background: rgb(186 230 253 / 6%);
}

.particle {
  position: absolute;
  display: block;
  opacity: 0;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.field-rain .particle {
  width: 1px;
  height: 18px;
  background: linear-gradient(to bottom, rgb(147 197 253 / 0%), rgb(147 197 253 / 55%));
  animation-name: field-fall;
  transform: rotate(12deg);
}

.field-sun .particle {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(253 186 116 / 45%);
  animation-name: field-drift-up;
}

.field-sand .particle {
  width: 3px;
  height: 2px;
  border-radius: 1px;
  background: rgb(214 170 104 / 55%);
  animation-name: field-blow;
}

.field-hail .particle {
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: rgb(224 242 254 / 60%);
  animation-name: field-fall;
}

@keyframes field-fall {
  0% {
    opacity: 0;
    translate: 0 -40px;
  }

  15%,
  85% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    translate: -18px 160px;
  }
}

@keyframes field-drift-up {
  0% {
    opacity: 0;
    translate: 0 30px;
  }

  30%,
  70% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    translate: 10px -60px;
  }
}

@keyframes field-blow {
  0% {
    opacity: 0;
    translate: -60px 0;
  }

  20%,
  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    translate: 140px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .particle {
    display: none;
  }
}
</style>
