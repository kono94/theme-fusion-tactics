import * as THREE from 'three'
import { atmosphere, board, combine, lighting, mesh, standard, water, type ArenaTheme } from './kit'

export const baratie: ArenaTheme = {
  id: 'baratie',
  label: 'Baratie',
  build: (scene, root) => {
    atmosphere(scene, root, '#1e3a8a', '#fdba74', 20, 50)
    lighting(root, { sky: '#fed7aa', ground: '#1e3a5f', sun: '#ffd8a8', sunIntensity: 2.4, sunPosition: [-8, 7, -4] })
    const sea = water(root, '#0e5a8a', { y: -1.2, amplitude: 0.16 })
    board(root, { near: '#b7791f', far: '#a16207', base: '#6b3f12', checker: 0.03, roughness: 0.9 })

    const hull = mesh(new THREE.BoxGeometry(11.5, 1.4, 8.4), standard('#7c2d12'), [0, -1.1, 0])
    root.add(hull)
    const trim = mesh(new THREE.BoxGeometry(11.6, 0.18, 8.5), standard('#fbbf24'), [0, -0.45, 0])
    root.add(trim)

    const head = new THREE.Group()
    head.add(mesh(new THREE.SphereGeometry(2.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), standard('#b45309'), [0, -0.6, 0]))
    head.add(mesh(new THREE.SphereGeometry(0.45, 16, 12), standard('#f8fafc'), [-1.2, 0.6, 1.6]))
    head.add(mesh(new THREE.SphereGeometry(0.45, 16, 12), standard('#f8fafc'), [1.2, 0.6, 1.6]))
    head.add(mesh(new THREE.SphereGeometry(0.2, 12, 8), standard('#0f172a'), [-1.2, 0.65, 1.98]))
    head.add(mesh(new THREE.SphereGeometry(0.2, 12, 8), standard('#0f172a'), [1.2, 0.65, 1.98]))
    head.scale.set(1.4, 0.9, 1)
    head.position.set(0, -0.4, -6.2)
    head.rotation.y = Math.PI
    root.add(head)

    const restaurant = new THREE.Group()
    restaurant.add(mesh(new THREE.BoxGeometry(7, 2.2, 2.2), standard('#fef3c7'), [0, 1.1, 0]))
    restaurant.add(mesh(new THREE.BoxGeometry(7.4, 0.3, 2.6), standard('#b91c1c'), [0, 2.35, 0]))
    restaurant.add(mesh(new THREE.BoxGeometry(3, 1.4, 1.6), standard('#fde68a'), [0, 3.2, 0]))
    restaurant.add(mesh(new THREE.ConeGeometry(1.9, 1, 4), standard('#b91c1c'), [0, 4.4, 0]))
    for (let index = -2; index <= 2; index++) {
      restaurant.add(mesh(new THREE.BoxGeometry(0.6, 0.7, 0.05), standard('#1e3a8a', { emissive: '#fbbf24', emissiveIntensity: 0.25 }), [index * 1.3, 1.3, 1.12]))
    }
    restaurant.position.set(0, -0.4, -5.2)
    root.add(restaurant)

    for (const side of [-1, 1]) {
      const fin = mesh(new THREE.ConeGeometry(1.2, 3, 3), standard('#9a3412'), [side * 6.4, -0.6, 0.5])
      fin.rotation.z = side * -Math.PI / 2.4
      fin.scale.z = 0.25
      root.add(fin)
      for (let post = -3; post <= 3; post++) {
        root.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6), standard('#78350f'), [side * 5.3, -0.1, post * 1.1]))
      }
      root.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 7.2), standard('#92400e'), [side * 5.3, 0.2, 0]))
    }
    const tail = mesh(new THREE.ConeGeometry(1.8, 2.6, 3), standard('#b45309'), [0, 0.4, 5.6])
    tail.rotation.x = Math.PI / 2
    tail.scale.x = 0.25
    root.add(tail)

    const gulls: THREE.Mesh[] = []
    for (let index = 0; index < 5; index++) {
      const gull = mesh(new THREE.ConeGeometry(0.12, 0.6, 3), standard('#f8fafc'), [0, 6, -8], false)
      gull.rotation.z = Math.PI / 2
      root.add(gull)
      gulls.push(gull)
    }
    return combine(sea, {
      update: (timeMs) => {
        const t = timeMs * 0.0003
        gulls.forEach((gull, index) => {
          const angle = t + index * 1.3
          gull.position.set(Math.cos(angle) * (9 + index), 5 + Math.sin(angle * 3) * 0.4, -8 + Math.sin(angle) * 3)
        })
      },
    })
  },
}
