import type { SnapshotProductionItem } from '@rts/protocol'
import { useEffect, useRef } from 'react'
import { useTimedValue } from './useTimedValue'

interface ProductionSnapshot {
  readonly producerId: number
  readonly queue: readonly SnapshotProductionItem[]
}

function itemIdentity(item: SnapshotProductionItem): string {
  return 'researchType' in item
    ? `research:${item.researchType}:${item.cost.GOLD ?? 0}:${item.totalTicks}`
    : `unit:${item.unitKind}:${item.cost.GOLD ?? 0}:${item.reservedSupply}:${item.totalTicks}`
}

function activeItem(queue: readonly SnapshotProductionItem[]): SnapshotProductionItem | undefined {
  return queue.find((item) => item.status === 'ACTIVE' || item.status === 'COMPLETED_WAITING')
}

export function useProductionTransitions(producerId: number, queue: readonly SnapshotProductionItem[]) {
  const previous = useRef<ProductionSnapshot | null>(null)
  const insertedSlots = useTimedValue<readonly number[]>(240)
  const activeStarted = useTimedValue<boolean>(240)
  const completed = useTimedValue<boolean>(280)
  const showInsertedSlots = insertedSlots.show
  const showActiveStarted = activeStarted.show
  const showCompleted = completed.show

  useEffect(() => {
    const prior = previous.current
    const current: ProductionSnapshot = { producerId, queue }
    previous.current = current
    if (prior === null || prior.producerId !== producerId) {
      return
    }

    if (queue.length > prior.queue.length) {
      showInsertedSlots(
        Array.from({ length: queue.length - prior.queue.length }, (_, index) => prior.queue.length + index)
      )
    }

    const priorActive = activeItem(prior.queue)
    const currentActive = activeItem(queue)
    if (currentActive?.status === 'ACTIVE' && priorActive?.status !== 'ACTIVE') {
      showActiveStarted(true)
    }
    if (
      priorActive?.status === 'ACTIVE' &&
      (currentActive?.status === 'COMPLETED_WAITING' ||
        currentActive === undefined ||
        itemIdentity(priorActive) !== itemIdentity(currentActive))
    ) {
      showCompleted(true)
    }
  }, [producerId, queue, showActiveStarted, showCompleted, showInsertedSlots])

  return {
    insertedSlots: insertedSlots.value ?? [],
    activeStarted: activeStarted.value === true,
    completed: completed.value === true
  }
}
