import type { MapDefinition, ResourceDefinition } from '@rts/shared'
import { type Container, Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'
import type { RenderResource } from '../core/types.js'
import type { ResourceFallbackTextures } from './resource-fallback.js'

const CELL_PIXELS = 512
const RESOURCE_SIZE = 56
const FIXED_PER_RENDER_PIXEL = 4
const FIXED_PER_CHUNK = 2048

interface ViewBounds {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

interface ResourceChunk {
  readonly containers: readonly ParticleContainer[]
  readonly resourceIds: readonly number[]
}

function chunkKey(resource: ResourceDefinition): string {
  return `${Math.floor(resource.x / FIXED_PER_CHUNK)},${Math.floor(resource.y / FIXED_PER_CHUNK)}`
}

function resourcePosition(resource: ResourceDefinition): { readonly x: number; readonly y: number } {
  return { x: resource.x / FIXED_PER_RENDER_PIXEL, y: resource.y / FIXED_PER_RENDER_PIXEL }
}

function chunkBounds(key: string): Rectangle {
  const [xText, yText] = key.split(',')
  return new Rectangle(Number(xText) * CELL_PIXELS, Number(yText) * CELL_PIXELS, CELL_PIXELS, CELL_PIXELS)
}

function intersects(bounds: ViewBounds, chunk: Rectangle): boolean {
  return (
    chunk.x + chunk.width >= bounds.left &&
    chunk.x <= bounds.right &&
    chunk.y + chunk.height >= bounds.top &&
    chunk.y <= bounds.bottom
  )
}

/** Chunked, static particle presentation for map-authored resources. */
export class ResourceLayer {
  private readonly definitions = new Map<number, ResourceDefinition>()
  private readonly remaining = new Map<number, number>()
  private readonly idsByCell = new Map<string, number[]>()
  private readonly chunks = new Map<string, ResourceChunk>()
  private viewBounds: ViewBounds | null = null

  constructor(
    private readonly layer: Container,
    map: MapDefinition | undefined,
    private readonly fallbackTextures: ResourceFallbackTextures
  ) {
    for (const resource of map?.resources ?? []) {
      this.definitions.set(resource.resourceId, resource)
      this.remaining.set(resource.resourceId, resource.initialAmount)
      const key = chunkKey(resource)
      const ids = this.idsByCell.get(key) ?? []
      ids.push(resource.resourceId)
      this.idsByCell.set(key, ids)
    }
  }

  present(updates: readonly RenderResource[]): void {
    const changed = new Set<string>()
    for (const update of updates) {
      const definition = this.definitions.get(update.resourceId)
      if (definition === undefined || this.remaining.get(update.resourceId) === update.remaining) {
        continue
      }
      this.remaining.set(update.resourceId, update.remaining)
      changed.add(chunkKey(definition))
    }
    for (const key of changed) {
      if (this.chunks.has(key)) {
        this.rebuildChunk(key)
      }
    }
  }

  resourceAt(x: number, y: number): number | null {
    const cellX = Math.floor((x * FIXED_PER_RENDER_PIXEL) / FIXED_PER_CHUNK)
    const cellY = Math.floor((y * FIXED_PER_RENDER_PIXEL) / FIXED_PER_CHUNK)
    let selected: number | null = null
    let distance = Number.POSITIVE_INFINITY
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (const id of this.idsByCell.get(`${cellX + offsetX},${cellY + offsetY}`) ?? []) {
          const definition = this.definitions.get(id)!
          const position = resourcePosition(definition)
          const dx = position.x - x
          const dy = position.y - y
          const candidate = dx * dx + dy * dy
          if (
            candidate <= RESOURCE_SIZE * RESOURCE_SIZE &&
            (candidate < distance || (candidate === distance && (selected === null || id < selected)))
          ) {
            selected = id
            distance = candidate
          }
        }
      }
    }
    return selected
  }

  setViewBounds(bounds: ViewBounds): void {
    this.viewBounds = bounds
    this.rebuildVisibleChunks()
  }

  visibleObjectCount(): number {
    let count = 0
    for (const chunk of this.chunks.values()) {
      for (const container of chunk.containers) {
        count += container.particleChildren.length
      }
    }
    return count
  }

  resourceStats(): {
    readonly definitions: number
    readonly active: number
    readonly depleted: number
    readonly visibleChunks: number
    readonly materializedChunks: number
    readonly activeVisuals: number
    readonly stumps: number
  } {
    let active = 0
    let depleted = 0
    for (const amount of this.remaining.values()) {
      if (amount > 0) {
        active += 1
      } else {
        depleted += 1
      }
    }
    let activeVisuals = 0
    let stumps = 0
    for (const chunk of this.chunks.values()) {
      for (const id of chunk.resourceIds) {
        if ((this.remaining.get(id) ?? 0) > 0) {
          activeVisuals += 1
        } else {
          stumps += 1
        }
      }
    }
    return {
      definitions: this.definitions.size,
      active,
      depleted,
      visibleChunks: this.chunks.size,
      materializedChunks: this.chunks.size,
      activeVisuals,
      stumps
    }
  }

  private rebuildVisibleChunks(): void {
    if (this.viewBounds === null) {
      return
    }
    for (const key of this.idsByCell.keys()) {
      const visible = intersects(this.viewBounds, chunkBounds(key))
      if (visible && !this.chunks.has(key)) {
        this.rebuildChunk(key)
      } else if (!visible && this.chunks.has(key)) {
        this.destroyChunk(key)
      }
    }
  }

  private rebuildChunk(key: string): void {
    this.destroyChunk(key)
    const resourceIds = this.idsByCell.get(key) ?? []
    const particlesByTexture = new Map<Texture, Particle[]>()
    for (const id of resourceIds) {
      const definition = this.definitions.get(id)
      if (definition === undefined) {
        continue
      }
      const amount = this.remaining.get(id) ?? 0
      const visual = this.fallbackTextures[definition.kind]
      const texture = amount <= 0 ? visual.depleted : visual.active
      const position = resourcePosition(definition)
      const particles = particlesByTexture.get(texture) ?? []
      particles.push(
        new Particle({
          texture,
          x: position.x,
          y: position.y,
          anchorX: 0.5,
          anchorY: 0.5,
          scaleX: RESOURCE_SIZE / texture.width,
          scaleY: RESOURCE_SIZE / texture.height,
          tint: 0xffffff
        })
      )
      particlesByTexture.set(texture, particles)
    }
    if (particlesByTexture.size === 0) {
      return
    }
    const bounds = chunkBounds(key)
    const containers: ParticleContainer[] = []
    for (const [texture, particles] of particlesByTexture) {
      const container = new ParticleContainer({
        texture,
        particles,
        boundsArea: bounds,
        dynamicProperties: { position: false, rotation: false, vertex: false, uvs: false, color: false },
        roundPixels: true
      })
      container.update()
      container.eventMode = 'none'
      this.layer.addChild(container)
      containers.push(container)
    }
    this.chunks.set(key, { containers, resourceIds })
  }

  private destroyChunk(key: string): void {
    const existing = this.chunks.get(key)
    if (existing === undefined) {
      return
    }
    for (const container of existing.containers) {
      this.layer.removeChild(container)
      container.destroy()
    }
    this.chunks.delete(key)
  }
}
