import * as THREE from 'three'
import { atmosphere, board, combine, ground, lighting, mesh, scatter, standard, weather, type ArenaTheme } from './kit'

function mangrove(root: THREE.Group, x: number, z: number, scale: number): void {
  const group = new THREE.Group()
  group.add(mesh(new THREE.CylinderGeometry(1.2, 2, 14, 16), standard('#6b4f3a'), [0, 6.5, 0]))
  for (let index = 0; index < 5; index++) {
    const root3 = mesh(new THREE.TorusGeometry(1.6, 0.35, 8, 16, Math.PI), standard('#5b4030'), [0, 0, 0])
    root3.rotation.y = (index / 5) * Math.PI * 2
    root3.position.set(Math.cos(root3.rotation.y) * 1.6, 0, -Math.sin(root3.rotation.y) * 1.6)
    group.add(root3)
  }
  group.add(mesh(new THREE.IcosahedronGeometry(4, 1), standard('#3f7d58', { flatShading: true }), [0, 14, 0]))
  group.position.set(x, -0.4, z)
  group.scale.setScalar(scale)
  root.add(group)
}

export const sabaody: ArenaTheme = {
  id: 'sabaody',
  label: 'Sabaody Archipelago',
  build: (scene, root) => {
    atmosphere(scene, root, '#5eead4', '#ccfbf1', 16, 42)
    lighting(root, { sky: '#ccfbf1', ground: '#14532d', sun: '#fefce8', sunIntensity: 2, rim: '#99f6e4' })
    ground(root, '#4d7c5a')
    board(root, { near: '#6ee7b7', far: '#86c5a4', base: '#5b4030', checker: 0.04 })

    mangrove(root, -9, -9, 1)
    mangrove(root, 7, -11, 1.2)
    mangrove(root, 13, -2, 0.8)
    mangrove(root, -14, 1, 0.9)

    const bubbleMaterial = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.28,
      roughness: 0.05,
      metalness: 0.4,
      emissive: '#a5f3fc',
      emissiveIntensity: 0.15,
      depthWrite: false,
    })
    const bubbles: { mesh: THREE.Mesh; x: number; z: number; speed: number; phase: number }[] = []
    scatter(22, [5.5, 13], (x, z) => {
      const size = 0.25 + Math.random() * 0.7
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), bubbleMaterial)
      root.add(bubble)
      bubbles.push({ mesh: bubble, x, z, speed: 0.3 + Math.random() * 0.4, phase: Math.random() * 10 })
    })
    const sparkle = weather(root, { color: '#f0fdfa', count: 50, size: 0.06, fall: 0.3, rise: true, sway: 0.5 })
    return combine(sparkle, {
      update: (timeMs) => {
        const t = timeMs * 0.001
        bubbles.forEach((bubble) => {
          const y = ((t * bubble.speed + bubble.phase) % 9) - 0.5
          bubble.mesh.position.set(bubble.x + Math.sin(t + bubble.phase) * 0.4, y, bubble.z)
        })
      },
    })
  },
}
