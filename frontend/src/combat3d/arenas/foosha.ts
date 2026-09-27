import * as THREE from 'three'
import { atmosphere, board, combine, lighting, mesh, standard, water, weather, type ArenaTheme } from './kit'

function house(root: THREE.Group, x: number, z: number, wall: string, roof: string, scale = 1): void {
  const group = new THREE.Group()
  group.add(mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), standard(wall), [0, 0.6, 0]))
  const top = mesh(new THREE.ConeGeometry(1.3, 0.9, 4), standard(roof), [0, 1.65, 0])
  top.rotation.y = Math.PI / 4
  group.add(top)
  group.add(mesh(new THREE.BoxGeometry(0.4, 0.7, 0.05), standard('#5b3a1e'), [0, 0.35, 0.72]))
  group.position.set(x, -0.4, z)
  group.scale.setScalar(scale)
  group.rotation.y = Math.atan2(-x, -z) + Math.PI
  root.add(group)
}

function tree(root: THREE.Group, x: number, z: number, scale = 1): void {
  const group = new THREE.Group()
  group.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), standard('#7c4a1e'), [0, 0.6, 0]))
  group.add(mesh(new THREE.IcosahedronGeometry(0.8, 1), standard('#3f8f3a', { flatShading: true }), [0, 1.6, 0]))
  group.position.set(x, -0.4, z)
  group.scale.setScalar(scale)
  root.add(group)
}

export const fooshaVillage: ArenaTheme = {
  id: 'foosha',
  label: 'Foosha Village',
  build: (scene, root) => {
    atmosphere(scene, root, '#38bdf8', '#e0f2fe', 22, 55)
    lighting(root, { sky: '#e0f2fe', ground: '#4d7c0f', sun: '#fff7e0', sunIntensity: 2.6 })
    const sea = water(root, '#1d8fd8', { y: -0.9, amplitude: 0.1 })
    const island = mesh(new THREE.CylinderGeometry(15, 17, 1, 48), standard('#6aa84f'), [0, -0.9, -2], false)
    island.receiveShadow = true
    root.add(island)
    board(root, { near: '#8bc34a', far: '#a3b86c', base: '#6b4f2a', checker: 0.05 })

    const windmill = new THREE.Group()
    windmill.add(mesh(new THREE.CylinderGeometry(0.6, 1, 4, 12), standard('#f5f5f4'), [0, 2, 0]))
    windmill.add(mesh(new THREE.ConeGeometry(0.9, 1, 12), standard('#b45309'), [0, 4.5, 0]))
    const blades = new THREE.Group()
    for (let index = 0; index < 4; index++) {
      const blade = mesh(new THREE.BoxGeometry(0.35, 2.4, 0.05), standard('#fef3c7'), [0, 1.2, 0])
      const arm = new THREE.Group()
      arm.add(blade)
      arm.rotation.z = (index / 4) * Math.PI * 2
      blades.add(arm)
    }
    blades.position.set(0, 3.7, 0.95)
    windmill.add(blades)
    windmill.position.set(-7.5, -0.4, -6.5)
    windmill.rotation.y = 0.5
    root.add(windmill)

    house(root, -3.5, -7.5, '#fde68a', '#b91c1c')
    house(root, 0.5, -8.2, '#fef3c7', '#9a3412', 1.1)
    house(root, 4.5, -7.2, '#e7e5e4', '#1d4ed8', 0.9)
    house(root, 8, -4.5, '#fde68a', '#b91c1c', 0.85)
    tree(root, -6, -3.5, 1.1)
    tree(root, 7, -7.5, 1.3)
    tree(root, -9, -2)
    tree(root, 9, 0.5, 0.9)

    const pollen = weather(root, { color: '#fffbeb', count: 60, size: 0.07, fall: 0.15, sway: 0.8, opacity: 0.7 })
    return combine(sea, pollen, {
      update: (timeMs) => {
        blades.rotation.z = timeMs * 0.0006
      },
    })
  },
}
