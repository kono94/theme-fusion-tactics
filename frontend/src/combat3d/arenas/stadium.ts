import * as THREE from 'three'
import { ARENA_COLUMNS, ARENA_ROWS } from '../types'
import { atmosphere, board, combine, ground, lighting, mesh, standard, type ArenaTheme } from './kit'

function line(root: THREE.Group, width: number, depth: number, x: number, z: number): void {
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.85 }),
  )
  stripe.rotation.x = -Math.PI / 2
  stripe.position.set(x, 0.068, z)
  root.add(stripe)
}

export const stadium: ArenaTheme = {
  id: 'stadium',
  label: 'Battle Stadium',
  build: (scene, root) => {
    atmosphere(scene, root, '#0b1026', '#1e293b', 20, 48)
    lighting(root, { sky: '#dbeafe', ground: '#14532d', sun: '#ffffff', sunIntensity: 2.6, sunPosition: [0, 14, 5] })
    ground(root, '#166534')
    board(root, { near: '#4ade80', far: '#22c55e', base: '#e2e8f0', checker: 0.05, baseHeight: 0.3 })

    const halfW = ARENA_COLUMNS / 2
    const halfD = ARENA_ROWS / 2
    line(root, ARENA_COLUMNS, 0.06, 0, -halfD)
    line(root, ARENA_COLUMNS, 0.06, 0, halfD)
    line(root, 0.06, ARENA_ROWS, -halfW, 0)
    line(root, 0.06, ARENA_ROWS, halfW, 0)
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.22, 64),
      new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.85 }),
    )
    circle.rotation.x = -Math.PI / 2
    circle.position.y = 0.068
    root.add(circle)

    const crowdColors = ['#ef4444', '#3b82f6', '#facc15', '#22c55e', '#f8fafc', '#a855f7']
    const crowd: THREE.InstancedMesh[] = []
    const tiers = 5
    const stands: [number, number, number, number][] = [
      [0, -8.5, 20, 0],
      [-11, -1, 12, Math.PI / 2],
      [11, -1, 12, -Math.PI / 2],
    ]
    for (const [x, z, length, rotation] of stands) {
      const stand = new THREE.Group()
      for (let tier = 0; tier < tiers; tier++) {
        stand.add(mesh(new THREE.BoxGeometry(length, 0.6, 1), standard('#475569'), [0, tier * 0.6, -tier]))
      }
      const fans = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial(), tiers * Math.floor(length / 0.5))
      const matrix = new THREE.Matrix4()
      let index = 0
      for (let tier = 0; tier < tiers; tier++) {
        for (let seat = 0; seat < Math.floor(length / 0.5); seat++) {
          matrix.makeTranslation(-length / 2 + seat * 0.5 + 0.25, tier * 0.6 + 0.5, -tier)
          fans.setMatrixAt(index, matrix)
          fans.setColorAt(index, new THREE.Color(crowdColors[(seat * 7 + tier * 3) % crowdColors.length]))
          index++
        }
      }
      stand.add(fans)
      crowd.push(fans)
      stand.position.set(x, -0.4, z)
      stand.rotation.y = rotation
      root.add(stand)
    }

    for (const [x, z] of [[-10, -8], [10, -8], [-11, 6], [11, 6]]) {
      root.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 9), standard('#64748b', { metalness: 0.6 }), [x, 4, z]))
      const panel = mesh(new THREE.BoxGeometry(1.6, 1, 0.2), standard('#f8fafc', { emissive: '#ffffff', emissiveIntensity: 1.4 }), [x, 8.6, z], false)
      panel.lookAt(0, 0, 0)
      root.add(panel)
    }

    return combine({
      update: (timeMs) => {
        crowd.forEach((fans, index) => {
          fans.position.y = Math.max(0, Math.sin(timeMs * 0.008 + index)) * 0.06
        })
      },
    })
  },
}
