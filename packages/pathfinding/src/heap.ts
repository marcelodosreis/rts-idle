export interface MinHeap<T> {
  readonly size: number
  readonly push: (value: T) => void
  readonly pop: () => T | undefined
  readonly toArray: () => readonly T[]
}

function swap<T>(values: T[], firstIndex: number, secondIndex: number): void {
  const first = values[firstIndex]
  const second = values[secondIndex]
  if (first === undefined || second === undefined) {
    throw new Error('heap index is outside the value list')
  }
  values[firstIndex] = second
  values[secondIndex] = first
}

function bubbleUp<T>(values: T[], compare: (left: T, right: T) => number): void {
  let index = values.length - 1
  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2)
    const value = values[index]
    const parent = values[parentIndex]
    if (value === undefined || parent === undefined || compare(value, parent) >= 0) {
      return
    }
    swap(values, index, parentIndex)
    index = parentIndex
  }
}

export function createMinHeap<T>(compare: (left: T, right: T) => number, initialValues: readonly T[] = []): MinHeap<T> {
  const values: T[] = [...initialValues]
  for (let index = Math.floor(values.length / 2) - 1; index >= 0; index -= 1) {
    bubbleDownFrom(values, compare, index)
  }
  return {
    get size(): number {
      return values.length
    },
    push(value): void {
      values.push(value)
      bubbleUp(values, compare)
    },
    pop(): T | undefined {
      const first = values[0]
      if (first === undefined) {
        return undefined
      }
      const last = values.pop()
      if (values.length > 0 && last !== undefined) {
        values[0] = last
        bubbleDownFrom(values, compare, 0)
      }
      return first
    },
    toArray(): readonly T[] {
      return Object.freeze([...values])
    }
  }
}

function bubbleDownFrom<T>(values: T[], compare: (left: T, right: T) => number, startIndex: number): void {
  let index = startIndex
  while (true) {
    const leftIndex = index * 2 + 1
    const rightIndex = leftIndex + 1
    let smallestIndex = index
    const current = values[index]
    const left = values[leftIndex]
    const right = values[rightIndex]
    if (current === undefined) {
      return
    }
    if (left !== undefined && compare(left, current) < 0) {
      smallestIndex = leftIndex
    }
    const smallest = values[smallestIndex]
    if (right !== undefined && smallest !== undefined && compare(right, smallest) < 0) {
      smallestIndex = rightIndex
    }
    if (smallestIndex === index) {
      return
    }
    swap(values, index, smallestIndex)
    index = smallestIndex
  }
}
