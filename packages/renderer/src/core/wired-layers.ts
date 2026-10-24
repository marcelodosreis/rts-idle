import type { Viewport } from 'pixi-viewport'
import type { EffectsLayer } from '../effects/layer.js'
import type { CommandPing } from '../effects/ping.js'
import type { SelectionController } from '../effects/selection.js'
import type { FogLayer } from '../fog/layer.js'
import type { createCameraController } from '../input/camera-controller.js'
import type { WorldInputAdapter } from '../input/world-input-adapter.js'
import type { ProjectileLayer } from '../projectiles/layer.js'
import type { ResourceLayer } from '../resources/resource-layer.js'
import type { TerrainLayer } from '../terrain/layer.js'
import type { UnitLayer } from '../units/layer.js'
import type { WorldObjectLayer } from '../world/object-layer.js'

export interface WiredLayers {
  readonly viewport: Viewport
  readonly units: UnitLayer
  readonly projectiles: ProjectileLayer
  readonly fog: FogLayer
  readonly selection: SelectionController
  readonly ping: CommandPing
  readonly effects: EffectsLayer
  readonly terrain: TerrainLayer
  readonly worldObjects: WorldObjectLayer
  readonly resources: ResourceLayer
  readonly input: WorldInputAdapter
  readonly camera: ReturnType<typeof createCameraController>
}

export function disposeUnwiredLayers(projectiles: ProjectileLayer, terrain: TerrainLayer): void {
  projectiles.dispose()
  terrain.dispose()
}
