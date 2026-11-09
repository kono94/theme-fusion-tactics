import * as THREE from 'three'
import { atmosphere, board, combine, lighting, mesh, scatter, standard, water, weather, type ArenaTheme } from './kit'

// A curved trunk of tapering segments with drooping fronds, leaning away from the board.
function palm(root: THREE.Group, x: number, z: number, lean: number): void {
  const palmTree = new THREE.Group()
  const segments = 6
  let top = new THREE.Vector3(0, 0, 0)
  for (let index = 0; index < segments; index++) {
    const radius = 0.16 - index * 0.015
    const piece = mesh(new THREE.CylinderGeometry(radius * 0.9, radius, 0.55, 7), standard(index % 2 ? '#8b6b43' : '#7a5c37'), [top.x, top.y + 0.27, 0])
    piece.rotation.z = -lean * index * 0.06
    palmTree.add(piece)
    top = new THREE.Vector3(top.x + lean * index * 0.035, top.y + 0.52, 0)
  }
  const fronds = 7
  for (let index = 0; index < fronds; index++) {
    const frond = mesh(new THREE.ConeGeometry(0.22, 1.7, 4), standard(index % 2 ? '#15803d' : '#16a34a', { flatShading: true }), [0, 0, 0])
    frond.scale.z = 0.18
    frond.geometry.translate(0, 0.85, 0)
    const pivot = new THREE.Group()
    pivot.position.copy(top)
    pivot.rotation.set(0, (index / fronds) * Math.PI * 2, 1.15 + (index % 2) * 0.2)
    pivot.add(frond)
    palmTree.add(pivot)
  }
  palmTree.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), standard('#5b4a2e'), [top.x + 0.08, top.y - 0.1, 0.08]))
  palmTree.position.set(x, -0.55, z)
  palmTree.rotation.y = Math.atan2(-z, x)
  root.add(palmTree)
}

export const seaRoute: ArenaTheme = {
  id: 'sea-route',
  label: 'Sea Route',
  build: (scene, root) => {
    atmosphere(scene, root, '#2b8fd6', '#bfe6fb', 22, 56)
    lighting(root, { sky: '#e0f2fe', ground: '#0e7490', sun: '#fff4dc', sunIntensity: 2.6, sunPosition: [-5, 12, 6], rim: '#a5f3fc' })
    const sea = water(root, '#0891b2', { y: -0.9, amplitude: 0.14 })
    const shallows = mesh(new THREE.CylinderGeometry(9.5, 10.5, 0.4, 40), standard('#5eead4', { transparent: true, opacity: 0.55 }), [0, -0.95, 0], false)
    shallows.scale.z = 0.75
    root.add(shallows)
    const sand = mesh(new THREE.CylinderGeometry(7.2, 8.2, 0.6, 36), standard('#efd9a4'), [0, -0.72, 0])
    sand.scale.z = 0.7
    root.add(sand)
    board(root, { near: '#e7d3a0', far: '#d8c08a', base: '#8b5a2b', checker: 0.03, roughness: 0.95, line: '#fef9c3' })

    for (const side of [-1, 1]) {
      for (let post = -2; post <= 2; post++) {
        root.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1), standard('#6b4423'), [side * 5.1, -0.35, post * 1.5]))
      }
    }

    palm(root, -6.4, -3.4, 1)
    palm(root, 6.6, -2.6, 1)
    palm(root, -7.2, 1.6, 0.8)
    palm(root, 7.4, -5.2, 0.6)
    scatter(9, [9.5, 13], (x, z) => {
      const rock = mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.7, 0), standard('#7c7468', { flatShading: true }), [x, -0.85, z])
      rock.rotation.set(Math.random(), Math.random(), Math.random())
      root.add(rock)
    }, [Math.PI * 1.05, Math.PI * 1.95])
    for (const [x, z, size] of [[-14, -22, 4], [12, -26, 5.5], [24, -18, 3]]) {
      root.add(mesh(new THREE.ConeGeometry(size, size * 0.55, 9), standard('#4d7c0f', { flatShading: true }), [x, -0.9 + size * 0.27, z], false))
    }

    const gulls: THREE.Mesh[] = []
    for (let index = 0; index < 4; index++) {
      const gull = mesh(new THREE.ConeGeometry(0.1, 0.5, 3), standard('#f8fafc'), [0, 5, -8], false)
      gull.rotation.z = Math.PI / 2
      root.add(gull)
      gulls.push(gull)
    }
    const spray = weather(root, { color: '#e0f2fe', count: 40, size: 0.05, fall: 0.2, sway: 0.5, rise: true, opacity: 0.35, area: [22, 3, 16] })
    return combine(sea, spray, {
      update: (timeMs) => {
        gulls.forEach((gull, index) => {
          const angle = timeMs * 0.00025 + index * 1.6
          gull.position.set(Math.cos(angle) * 8, 4.8 + Math.sin(timeMs * 0.0015 + index) * 0.3, -9 + Math.sin(angle) * 3)
          gull.rotation.y = -angle
        })
      },
    })
  },
}
