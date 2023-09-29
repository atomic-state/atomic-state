import { Atom, Filter } from "./mod"

export const defaultAtomsValues: any = {}
export const atomsInitializeObjects: any = {}
export const filtersInitializeObjects: any = {}
export const defaultAtomsInAtomic: any = {}
export const defaultFiltersInAtomic: any = {}
export const usedKeys: any = {}
export const defaultFiltersValues: any = {}
export const atomsEffectsCleanupFunctons: any = {}
export const pendingAtoms: any = {}

/**
 * Get the current value of an atom. You can pass a specific prefix as the second argument.
 */
export function getAtomValue<R>(
  $atom: Atom<R> | Atom<R, any>,
  prefix?: string
): R {
  const $key = prefix
    ? [prefix, ($atom as any)["atom-name"]].join("-")
    : ($atom as any)["atom-name"]
  const $atomValue = defaultAtomsValues[$key]
  return $atomValue
}

/**
 * Get the current value of a filter. You can pass a specific prefix as the second argument.
 */
export function getFilterValue<R>(
  $filter: (() => R | Promise<R>) | Filter<R | Promise<R>>,
  prefix?: string
): R {
  const $key = prefix
    ? [prefix, ($filter as any)["filter-name"]].join("-")
    : ($filter as any)["filter-name"]

  const $filterValue = defaultFiltersValues[$key]
  return $filterValue
}

export const getAtom = getAtomValue
export const getFilter = getFilterValue
export const getSelector = getFilterValue

export function getValue<R = any>(init: Atom<R> | Filter<R>, prefix?: string) {
  const isFilter = (init as any)["init-object"].get
  if (!isFilter) {
    return getAtom(init, prefix)
  } else return getFilter(init as Filter<R>, prefix)
}
