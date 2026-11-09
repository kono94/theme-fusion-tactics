import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { WeatherLayer } from './weather'

describe('WeatherLayer', () => {
  it('creates one non-additive particle object per condition and disposes it', () => {
    const scene = new THREE.Scene()
    const layer = new WeatherLayer(scene, false)

    layer.set('sand')
    const sand = layer.root as THREE.Points
    expect(sand).toBeInstanceOf(THREE.Points)
    expect(scene.children).toContain(sand)
    const material = sand.material as THREE.PointsMaterial
    expect(material.blending).toBe(THREE.NormalBlending)
    expect(material.opacity).toBeLessThanOrEqual(0.6)

    const disposeGeometry = vi.spyOn(sand.geometry, 'dispose')
    const disposeMaterial = vi.spyOn(material, 'dispose')
    layer.set('rain')
    expect(disposeGeometry).toHaveBeenCalled()
    expect(disposeMaterial).toHaveBeenCalled()
    expect(scene.children).not.toContain(sand)
    expect(layer.root).toBeInstanceOf(THREE.LineSegments)

    layer.dispose()
    expect(layer.root).toBeNull()
    expect(layer.kind).toBeNull()
    expect(scene.children).toHaveLength(0)
  })

  it('moves particles over time and uses fewer, slower particles for reduced motion', () => {
    const full = new WeatherLayer(new THREE.Scene(), false)
    const reduced = new WeatherLayer(new THREE.Scene(), true)
    full.set('hail')
    reduced.set('hail')
    expect(reduced.particleCount).toBeLessThan(full.particleCount)

    const positions = (layer: WeatherLayer) =>
      Array.from((layer.root as THREE.Points).geometry.getAttribute('position').array)
    const fullStart = positions(full)
    const reducedStart = positions(reduced)
    full.update(0)
    full.update(50)
    reduced.update(0)
    reduced.update(50)

    const fullDrop = fullStart[1]! - positions(full)[1]!
    const reducedDrop = reducedStart[1]! - positions(reduced)[1]!
    expect(fullDrop).toBeGreaterThan(0)
    expect(reducedDrop).toBeGreaterThan(0)
    expect(reducedDrop).toBeLessThan(fullDrop)
  })

  it('ignores unknown or cleared conditions', () => {
    const scene = new THREE.Scene()
    const layer = new WeatherLayer(scene, false)
    layer.set(null)
    layer.update(100)
    expect(layer.root).toBeNull()
    expect(scene.children).toHaveLength(0)
  })
})
