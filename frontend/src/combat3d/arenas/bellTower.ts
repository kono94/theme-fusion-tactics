import * as THREE from 'three'
import { atmosphere, board, combine, ground, lighting, mesh, scatter, standard, weather, type ArenaTheme } from './kit'

const MAPLE_COLORS = ['#c2410c', '#dc2626', '#ea580c', '#d97706', '#b91c1c']

function roof(width: number, y: number): THREE.Mesh {
  const shape = mesh(new THREE.ConeGeometry(width * 0.78, 0.7, 4, 1, true), standard('#3b2f2f', { side: THREE.DoubleSide }), [0, y, 0])
  shape.rotation.y = Math.PI / 4
  return shape
}

// Ecruteak-style pagoda: stacked wooden storeys with flared tile roofs and a hanging bronze bell.
function pagoda(): { group: THREE.Group; bell: THREE.Object3D } {
  const group = new THREE.Group()
  group.add(mesh(new THREE.BoxGeometry(5.2, 0.6, 5.2), standard('#6b6259'), [0, 0.3, 0]))
  let y = 0.6
  let width = 4
  for (let storey = 0; storey < 5; storey++) {
    const height = storey === 0 ? 1.6 : 1.1
    group.add(mesh(new THREE.BoxGeometry(width, height, width), standard('#7c2d12'), [0, y + height / 2, 0]))
    for (const side of [-1, 1]) {
      group.add(mesh(new THREE.BoxGeometry(0.12, height, 0.12), standard('#451a03'), [side * width / 2, y + height / 2, width / 2]))
    }
    group.add(mesh(new THREE.BoxGeometry(width * 0.5, height * 0.45, 0.04), standard('#fbbf24', { emissive: '#f59e0b', emissiveIntensity: 0.2 }), [0, y + height * 0.5, width / 2 + 0.02]))
    y += height
    group.add(roof(width + 1.3, y + 0.25))
    y += 0.45
    width *= 0.8
  }
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 6), standard('#ca8a04', { metalness: 0.6, roughness: 0.4 }), [0, y + 0.8, 0]))
  const bell = new THREE.Group()
  bell.add(mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.7, 12), standard('#a16207', { metalness: 0.7, roughness: 0.35 }), [0, -0.45, 0]))
  bell.position.set(0, 2.15, 2.45)
  group.add(bell)
  return { group, bell }
}

function maple(root: THREE.Group, x: number, z: number, index: number): void {
  const height = 1.8 + Math.random() * 1.2
  root.add(mesh(new THREE.CylinderGeometry(0.1, 0.18, height, 6), standard('#3f2a1d'), [x, height / 2 - 0.4, z]))
  for (let cluster = 0; cluster < 4; cluster++) {
    const color = MAPLE_COLORS[(index + cluster) % MAPLE_COLORS.length]
    const offset = [Math.cos(cluster * 1.7) * 0.5, height - 0.3 + (cluster % 2) * 0.35, Math.sin(cluster * 1.7) * 0.5]
    root.add(mesh(new THREE.IcosahedronGeometry(0.55 + Math.random() * 0.25, 0), standard(color, { flatShading: true }), [x + offset[0], offset[1], z + offset[2]]))
  }
}

function lantern(root: THREE.Group, x: number, z: number): THREE.Mesh {
  const stone = standard('#9ca3af', { flatShading: true })
  root.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.2, 6), stone, [x, -0.3, z]))
  root.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.7, 6), stone, [x, 0.15, z]))
  const box = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), standard('#fde68a', { emissive: '#f59e0b', emissiveIntensity: 0.6 }), [x, 0.65, z])
  root.add(box)
  root.add(mesh(new THREE.ConeGeometry(0.36, 0.28, 4), stone, [x, 0.94, z]))
  return box
}

export const bellTower: ArenaTheme = {
  id: 'bell-tower',
  label: 'Bell Tower',
  build: (scene, root) => {
    atmosphere(scene, root, '#3b2a5a', '#f4a261', 18, 46)
    lighting(root, { sky: '#fed7aa', ground: '#3f2a1d', sun: '#ffc98a', sunIntensity: 2.3, sunPosition: [-7, 8, -2], rim: '#fb923c' })
    ground(root, '#5b4632')
    board(root, { near: '#b08d5b', far: '#9c7a4c', base: '#6b6259', checker: 0.04, roughness: 0.9, line: '#fef3c7' })

    const tower = pagoda()
    tower.group.position.set(0, -0.4, -10.5)
    root.add(tower.group)

    scatter(12, [7, 10], (x, z, index) => maple(root, x, z, index), [Math.PI * 1.02, Math.PI * 1.4])
    scatter(12, [7, 10], (x, z, index) => maple(root, x, z, index + 2), [Math.PI * 1.6, Math.PI * 1.98])
    const lamps = [[-5.8, -3.6], [5.8, -3.6], [-6, 2.4], [6, 2.4]].map(([x, z]) => lantern(root, x, z))

    const leaves = weather(root, { color: '#ea580c', count: 70, size: 0.09, fall: 0.35, sway: 0.9, opacity: 0.75 })
    return combine(leaves, {
      update: (timeMs) => {
        tower.bell.rotation.z = Math.sin(timeMs * 0.0012) * 0.08
        lamps.forEach((lamp, index) => {
          const material = lamp.material as THREE.MeshStandardMaterial
          material.emissiveIntensity = 0.55 + Math.sin(timeMs * 0.004 + index * 2) * 0.08
        })
      },
    })
  },
}
