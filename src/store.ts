import { Atom, Selector } from './mod'

export const defaultAtomsValues = new Map()
export const atomsInitializeObjects = new Map()
export const filtersInitializeObjects = atomsInitializeObjects
export const defaultAtomsInAtomic = new Map()
export const usedKeys = new Map()
export const defaultFiltersValues = new Map()
export const atomsEffectsCleanupFunctons = new Map()
export const pendingAtoms = new Map()

/**
 * Get the current value of an atom. You can pass a specific prefix as the second argument.
 */
export function getAtomValue<R>(
  $atom: Atom<R> | Atom<R, any>,
  prefix?: string
): R {
  const $key = prefix
    ? [prefix, ($atom as any)['atom-name']].join('-')
    : ($atom as any)['atom-name']
  const $atomValue = defaultAtomsValues.get($key)

  console.log({
    defaultAtomsValues,
    $key
  })
  return $atomValue
}

/**
 * Get the current value of a filter. You can pass a specific prefix as the second argument.
 */
export function getFilterValue<R>(
  $filter: (() => R | Promise<R>) | Selector<R | Promise<R>>,
  prefix?: string
): R {
  const $key = prefix
    ? [prefix, ($filter as any)['filter-name']].join('-')
    : ($filter as any)['filter-name']

  const $filterValue = defaultFiltersValues.get($key)
  return $filterValue
}

export const getAtom = getAtomValue
export const getFilter = getFilterValue
export const getSelector = getFilterValue

export function getValue<R = any>(
  init: Atom<R> | Selector<R>,
  storeName: string | boolean = false
) {
  const isFilter = (init as any)['init-object'].get
  if (!isFilter) {
    return getAtom(init, storeName as string)
  } else return getFilter(init as Selector<R>, storeName as string)
}
