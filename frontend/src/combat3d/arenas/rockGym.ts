import * as THREE from 'three'
import { atmosphere, board, combine, ground, lighting, mesh, scatter, standard, weather, type ArenaTheme } from './kit'

export const rockGym: ArenaTheme = {
  id: 'rock-gym',
  label: 'Rock Gym',
  build: (scene, root) => {
    atmosphere(scene, root, '#1c1917', '#44403c', 14, 34)
    lighting(root, { sky: '#fde68a', ground: '#292524', sun: '#fed7aa', sunIntensity: 2, sunPosition: [-4, 12, 3], rim: '#fdba74' })
    ground(root, '#57534e')
    board(root, { near: '#a8a29e', far: '#8b7d6b', base: '#44403c', checker: 0.05 })

    scatter(14, [6.5, 9.5], (x, z) => {
      const boulder = mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8, 0), standard('#78716c', { flatShading: true }), [x, 0, z])
      boulder.rotation.set(Math.random(), Math.random(), Math.random())
      root.add(boulder)
    }, [Math.PI * 1.05, Math.PI * 1.95])
    scatter(18, [11, 16], (x, z) => {
      const spire = mesh(new THREE.ConeGeometry(0.8 + Math.random(), 4 + Math.random() * 6, 6), standard('#57534e', { flatShading: true }), [x, 2, z])
      root.add(spire)
    }, [Math.PI * 0.95, Math.PI * 2.05])

    const torches: { light: THREE.PointLight; flame: THREE.Mesh }[] = []
    for (const [x, z] of [[-6, -4.5], [6, -4.5], [-6.5, 2], [6.5, 2]]) {
      root.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6), standard('#292524'), [x, 0.4, z]))
      const flame = mesh(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshBasicMaterial({ color: '#fb923c' }), [x, 1.45, z], false)
      root.add(flame)
      const light = new THREE.PointLight('#f97316', 5, 7)
      light.position.set(x, 1.6, z)
      root.add(light)
      torches.push({ light, flame })
    }

    const dust = weather(root, { color: '#d6d3d1', count: 90, size: 0.05, fall: 0.1, sway: 0.6, opacity: 0.5 })
    return combine(dust, {
      update: (timeMs) => {
        torches.forEach(({ light, flame }, index) => {
          const flicker = Math.sin(timeMs * 0.02 + index * 3) * 0.5 + Math.sin(timeMs * 0.047 + index) * 0.3
          light.intensity = 4.6 + flicker
          flame.scale.y = 1 + flicker * 0.15
        })
      },
    })
  },
}
