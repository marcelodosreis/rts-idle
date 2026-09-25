import type { SnapshotMineralNode } from '@rts/protocol'
import { MineralNode, Position, type World } from '@rts/simulation'

export function projectMineralNodes(world: World): readonly SnapshotMineralNode[] {
  const nodes = world.store(MineralNode)
  const positions = world.store(Position)
  return world
    .aliveIds()
    .filter((id) => nodes.has(id))
    .map((id) => {
      const position = positions.get(id)
      const node = nodes.get(id)
      if (position === undefined || node === undefined) {
        throw new Error(`GameSession: Mineral Node ${id} is missing position or state`)
      }
      return { id, x: position.x, y: position.y, remaining: node.remaining }
    })
}
