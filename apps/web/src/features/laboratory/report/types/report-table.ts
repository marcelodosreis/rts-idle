export type SortKey = 'key' | 'kind' | 'status'

export interface ContractRow {
  readonly label: string
  readonly key: string
  readonly found: boolean
}
