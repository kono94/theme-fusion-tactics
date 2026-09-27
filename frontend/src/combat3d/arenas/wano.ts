import * as THREE from 'three'
import { atmosphere, board, combine, ground, lighting, mesh, standard, weather, type ArenaTheme } from './kit'

function sakura(root: THREE.Group, x: number, z: number, scale = 1): void {
  const group = new THREE.Group()
  group.add(mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.8, 8), standard('#3f2a1d'), [0, 0.9, 0]))
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2
    group.add(mesh(new THREE.IcosahedronGeometry(0.75, 1), standard('#f9a8d4', { flatShading: true }), [Math.cos(angle) * 0.5, 2 + (index % 2) * 0.3, Math.sin(angle) * 0.5]))
  }
  group.position.set(x, -0.4, z)
  group.scale.setScalar(scale)
  root.add(group)
}

function pagodaRoof(width: number, y: number, color: string): THREE.Mesh {
  const roof = mesh(new THREE.ConeGeometry(width, 0.9, 4), standard(color), [0, y, 0])
  roof.rotation.y = Math.PI / 4
  roof.scale.y = 0.7
  return roof
}

export const wano: ArenaTheme = {
  id: 'wano',
  label: 'Wano Country',
  build: (scene, root) => {
    atmosphere(scene, root, '#4c1d95', '#fb923c', 16, 46)
    lighting(root, { sky: '#fed7aa', ground: '#3b0764', sun: '#fdba74', sunIntensity: 2.2, sunPosition: [-9, 6, -5], rim: '#c084fc' })
    ground(root, '#3f3a2a')
    board(root, { near: '#c8b27a', far: '#b5a36c', base: '#3f2a1d', checker: 0.03, line: '#7f1d1d' })

    const torii = new THREE.Group()
    const red = standard('#b91c1c')
    torii.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 12), red, [-2.4, 2.1, 0]))
    torii.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 12), red, [2.4, 2.1, 0]))
    torii.add(mesh(new THREE.BoxGeometry(6.4, 0.35, 0.45), standard('#1c1917'), [0, 4.35, 0]))
    torii.add(mesh(new THREE.BoxGeometry(5.6, 0.25, 0.3), red, [0, 3.6, 0]))
    torii.position.set(0, -0.4, -5.2)
    root.add(torii)

    const castle = new THREE.Group()
    castle.add(mesh(new THREE.CylinderGeometry(5, 7, 3, 6), standard('#44403c'), [0, 1.5, 0]))
    const tiers: [number, number, number][] = [
      [4, 2, 3],
      [3, 1.8, 5.1],
      [2.2, 1.6, 7],
    ]
    tiers.forEach(([width, height, y]) => {
      castle.add(mesh(new THREE.BoxGeometry(width, height, width), standard('#f5f5f4'), [0, y + height / 2 - 0.8, 0]))
      castle.add(pagodaRoof(width * 0.95, y + height - 0.6, '#292524'))
    })
    castle.position.set(-4, -0.4, -18)
    root.add(castle)

    sakura(root, -7.5, -4, 1.2)
    sakura(root, 7.5, -5, 1.3)
    sakura(root, -9, 1.5)
    sakura(root, 8.8, 2, 0.9)

    const lanterns: THREE.PointLight[] = []
    for (const x of [-6, 6]) {
      const lantern = mesh(new THREE.SphereGeometry(0.25, 12, 8), standard('#fca5a5', { emissive: '#f97316', emissiveIntensity: 1.2 }), [x, 1.6, -3.8], false)
      root.add(lantern)
      root.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 2), standard('#1c1917'), [x, 0.6, -3.8]))
      const light = new THREE.PointLight('#fb923c', 4, 6)
      light.position.set(x, 1.6, -3.8)
      root.add(light)
      lanterns.push(light)
    }

    const petals = weather(root, { color: '#fbcfe8', count: 140, size: 0.09, fall: 0.5, sway: 1.1 })
    return combine(petals, {
      update: (timeMs) => {
        lanterns.forEach((light, index) => {
          light.intensity = 3.5 + Math.sin(timeMs * 0.004 + index * 2) * 0.6
        })
      },
    })
  },
}
