export interface FacingState {
  readonly moving: boolean
  readonly facingLeft: boolean
  readonly lookAtX?: number
}

/** Movement direction wins while travelling; work targets orient stopped units. */
export function facingForState(currentFacing: number, currentX: number, state: FacingState): number {
  if (state.moving) {
    return state.facingLeft ? -1 : 1
  }
  if (state.lookAtX !== undefined) {
    return state.lookAtX < currentX ? -1 : 1
  }
  return currentFacing
}
