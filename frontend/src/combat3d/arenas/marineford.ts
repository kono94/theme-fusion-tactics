import * as THREE from 'three'
import { atmosphere, board, combine, lighting, mesh, scatter, standard, weather, type ArenaTheme } from './kit'

export const marineford: ArenaTheme = {
  id: 'marineford',
  label: 'Marineford',
  build: (scene, root) => {
    atmosphere(scene, root, '#475569', '#cbd5e1', 18, 46)
    lighting(root, { sky: '#e2e8f0', ground: '#334155', sun: '#f8fafc', sunIntensity: 2.8, sunPosition: [6, 12, 4], rim: '#bae6fd' })

    const ice = mesh(new THREE.PlaneGeometry(90, 90), standard('#dbeafe', { roughness: 0.2, metalness: 0.15 }), [0, -0.5, 0], false)
    ice.rotation.x = -Math.PI / 2
    ice.receiveShadow = true
    root.add(ice)
    scatter(26, [7, 18], (x, z) => {
      const chunk = mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.9, 0), standard('#e0f2fe', { roughness: 0.15, flatShading: true }), [x, -0.3, z])
      chunk.rotation.set(Math.random(), Math.random(), Math.random())
      root.add(chunk)
    }, [Math.PI * 0.1, Math.PI * 0.9])

    const plaza = mesh(new THREE.BoxGeometry(13, 0.5, 10), standard('#9ca3af'), [0, -0.45, -1])
    root.add(plaza)
    board(root, { near: '#a8a29e', far: '#94a3b8', base: '#57534e', checker: 0.05 })

    const scaffold = new THREE.Group()
    for (const x of [-1.6, 1.6]) {
      for (const z of [-0.8, 0.8]) {
        scaffold.add(mesh(new THREE.BoxGeometry(0.3, 4, 0.3), standard('#78716c'), [x, 2, z]))
      }
    }
    scaffold.add(mesh(new THREE.BoxGeometry(4, 0.4, 2.2), standard('#57534e'), [0, 4.2, 0]))
    scaffold.add(mesh(new THREE.BoxGeometry(0.25, 2, 0.25), standard('#44403c'), [0, 5.4, 0]))
    scaffold.add(mesh(new THREE.BoxGeometry(1.6, 0.2, 0.2), standard('#44403c'), [0, 6.1, 0]))
    scaffold.position.set(0, -0.4, -9)
    root.add(scaffold)

    const fortress = new THREE.Group()
    fortress.add(mesh(new THREE.BoxGeometry(12, 5, 3), standard('#e5e7eb'), [0, 2.5, 0]))
    fortress.add(mesh(new THREE.BoxGeometry(6, 3, 2.6), standard('#f3f4f6'), [0, 6.5, 0]))
    fortress.add(mesh(new THREE.BoxGeometry(2.8, 2, 2.2), standard('#f9fafb'), [0, 9, 0]))
    fortress.add(mesh(new THREE.BoxGeometry(6.2, 0.4, 2.8), standard('#1e3a8a'), [0, 8, 0]))
    fortress.position.set(0, -0.5, -15)
    root.add(fortress)

    for (const side of [-1, 1]) {
      const wall = mesh(new THREE.BoxGeometry(0.8, 3.2, 12), standard('#64748b', { metalness: 0.4, roughness: 0.5 }), [side * 8.5, 1.1, -2])
      root.add(wall)
    }

    const snow = weather(root, { color: '#ffffff', count: 220, size: 0.08, fall: 1.1, sway: 0.3 })
    return combine(snow)
  },
}
