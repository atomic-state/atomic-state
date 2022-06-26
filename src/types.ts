import { Dispatch, SetStateAction } from "react"

/**
 * Atom type
 */
export type Atom<T = any, ActionArgs = any> = {
  name: string
  default?: T | Promise<T> | (() => Promise<T>) | (() => T)
  localStoragePersistence?: boolean
  /**
   * Short for `localStoragePersistence`
   */
  persist?: boolean
  /**
   * If true, `persist` will keep the value in sync between tabs.
   * By default it's `true`
   */
  sync?: boolean
  /**
   * If `persist` is true, this will run whenever the state is updated from another tab. This will not run in the tab that updated the state.
   */
  onSync?(message: T): void
  /**
   * If false, no warning for duplicate keys will be shown
   */
  ignoreKeyWarning?: boolean
  /**
   * @deprecated
   * This is for use when `localStoragePersistence` is `true`
   * By default it's false. This is to prevent hydration errors.
   * If set to `false`, data from localStorage will be loaded during render, not after.
   * May have some bugs
   */
  hydration?: boolean
  actions?: {
    [E in keyof ActionArgs]: (st: {
      args: ActionArgs[E]
      state: T
      dispatch: Dispatch<SetStateAction<T>>
    }) => void
  }
  effects?: ((s: {
    previous: T
    state: T
    dispatch: Dispatch<SetStateAction<T>>
  }) => void)[]
}

export type ActionsObjectType<ArgsTypes = any> = {
  [E in keyof ArgsTypes]: (args?: ArgsTypes[E]) => any
}

export type useAtomType<R, ActionsArgs = any> = () => (
  | R
  | Dispatch<SetStateAction<R>>
  | ActionsObjectType<ActionsArgs>
)[]

/**
 * Type for the `get` function of filters
 */
export type FilterGet = {
  get<R>(atom: useAtomType<R> | Atom<R, any>): R
  read<R>(filter: (() => R | Promise<R>) | Filter<R | Promise<R>>): R
}

/**
 * Filter type
 */
export type Filter<T = any> = {
  name: string
  default?: T
  get(c: FilterGet): T
}
