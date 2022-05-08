/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventEmitter } from "events"

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

/**
 * Atom type
 */
export type Atom<T = any> = {
  name: string
  default?: T | Promise<T> | (() => Promise<T>) | (() => T)
  localStoragePersistence?: boolean
  actions?: {
    [name: string]: (st: {
      args: any
      state: T
      dispatch: Dispatch<SetStateAction<T>>
    }) => any
  }
}

type ActionsObjectType = { [name: string]: (args?: any) => any }

const atomEmitters: {
  [key: string]: {
    emitter: EventEmitter
    notify: (storeName: string, hookCall: string, payload?: {}) => void
  }
} = {}

function createEmitter() {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(10e12)
  function notify(storeName: string, hookCall: string, payload = {}) {
    emitter.emit(storeName, { hookCall, payload })
  }
  return {
    emitter,
    notify,
  }
}

const defaultAtomsValues: any = {}
const defaultAtomsInAtomic: any = {}
const defaultFiltersInAtomic: any = {}

const pendingAtoms: any = {}

export const AtomicState: React.FC<{
  children: any
  /**
   * Set default values using an atom's key
   */
  atoms?: {
    [key: string]: any
  }
  /**
   * Set default filters' values using filter key
   */
  filters?: {
    [key: string]: any
  }
}> = ({ children, atoms, filters }) => {
  if (atoms) {
    for (let atomKey in atoms) {
      defaultAtomsValues[atomKey] = atoms[atomKey]
      defaultAtomsInAtomic[atomKey] = true
    }
  }
  if (filters) {
    for (let filterKey in filters) {
      defaultFiltersValues[filterKey] = filters[filterKey]
      defaultFiltersInAtomic[filterKey] = true
    }
  }
  return children
}

function useAtomCreate<R>(init: Atom<R>) {
  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])

  const isDefined = typeof init.default !== "undefined"

  const initialValue = (function getInitialValue() {
    const isFunction =
      typeof defaultAtomsValues[init.name] === "undefined" &&
      typeof init.default === "function"

    const initialIfFnOrPromise = isFunction
      ? (init.default as any)()
      : init.default instanceof Promise
      ? init.default
      : undefined

    const isPromiseValue = initialIfFnOrPromise instanceof Promise

    const initVal = isDefined
      ? typeof defaultAtomsValues[init.name] === "undefined"
        ? !isPromiseValue
          ? typeof initialIfFnOrPromise !== "undefined"
            ? initialIfFnOrPromise
            : init.default
          : init.default
        : defaultAtomsValues[init.name]
      : defaultAtomsValues[init.name]

    try {
      if (init.localStoragePersistence) {
        if (typeof localStorage !== "undefined") {
          if (
            typeof defaultAtomsValues[init.name] === "undefined" ||
            defaultAtomsInAtomic[init.name]
          ) {
            defaultAtomsInAtomic[init.name] = false
            defaultAtomsValues[init.name] = JSON.parse(
              localStorage[`store-${init.name}`] as string
            )
          }
        }
      } else {
        if (typeof defaultAtomsValues[init.name] === "undefined") {
          defaultAtomsValues[init.name] = initVal
        }
      }
      return init.localStoragePersistence
        ? typeof localStorage !== "undefined"
          ? typeof localStorage[`store-${init.name}`] !== "undefined"
            ? // Only return value from localStorage if not loaded to memory
              defaultAtomsValues[init.name]
            : isPromiseValue
            ? undefined
            : initVal
          : isPromiseValue
          ? undefined
          : initVal
        : isPromiseValue
        ? undefined
        : initVal
    } catch (err) {
      return initVal
    }
  })()

  useEffect(() => {
    function storageListener() {
      if (typeof localStorage !== "undefined") {
        if (typeof localStorage[`store-${init.name}`] !== "undefined") {
          try {
            const newState = JSON.parse(localStorage[`store-${init.name}`])
            updateState(newState)
            // notify(init.name, hookCall, newState)
          } catch (err) {}
        }
      }
    }
    if (init.localStoragePersistence) {
      if (typeof window !== "undefined") {
        const canListen = typeof window.addEventListener !== "undefined"
        if (canListen) {
          window.addEventListener("storage", storageListener)
          return () => {
            if (typeof window !== "undefined") {
              window.removeEventListener("storage", storageListener)
            }
          }
        }
      }
    }
    return () => {}
  }, [init.name])

  const [state, setState] = useState<R>(
    (initialValue instanceof Promise || typeof initialValue === "function") &&
      typeof defaultAtomsValues[init.name] === "undefined"
      ? undefined
      : (() => {
          defaultAtomsValues[init.name] = initialValue
          return initialValue
        })()
  )

  if (!pendingAtoms[init.name]) {
    pendingAtoms[init.name] = 0
  }

  if (!atomEmitters[init.name]) {
    atomEmitters[init.name] = createEmitter()
  }

  const { emitter, notify } = atomEmitters[init.name]

  const updateState: Dispatch<SetStateAction<R>> = useCallback(
    (v) => {
      setState((previous) => {
        // First notify other subscribers
        const newValue = typeof v === "function" ? (v as any)(previous) : v
        defaultAtomsValues[init.name] = newValue
        notify(init.name, hookCall, newValue)
        // Finally update state
        return newValue
      })
    },
    [hookCall, notify, init.name]
  )
  useEffect(() => {
    async function getPromiseInitialValue() {
      // Only resolve promise if default or resolved value are not present
      if (typeof defaultAtomsValues[init.name] === "undefined") {
        if (typeof init.default === "function") {
          if (pendingAtoms[init.name] === 0) {
            pendingAtoms[init.name] += 1
            let v =
              typeof init.default !== "undefined"
                ? (async () =>
                    typeof init.default === "function"
                      ? (init.default as () => Promise<R>)()
                      : init.default)()
                : undefined
            if (typeof v !== "undefined") {
              v.then((val) => {
                defaultAtomsValues[init.name] = val
                updateState(val as R)
              })
            }
          } else {
            pendingAtoms[init.name] += 1
            if (state || defaultAtomsValues[init.name]) {
              atomEmitters[init.name].notify(
                init.name,
                hookCall,
                state || defaultAtomsValues[init.name]
              )
            }
          }
        }
      }
    }
    getPromiseInitialValue()
  }, [state, init.default, updateState, init.name, hookCall])

  useEffect(() => {
    return () => {
      pendingAtoms[init.name] = 0
    }
  }, [init.name])

  useEffect(() => {
    const handler = async (e: any) => {
      if (e.hookCall !== hookCall) {
        setTimeout(() => {
          setState(e.payload)
        }, 0)
      }
    }

    emitter.addListener(init.name, handler)

    return () => {
      emitter.removeListener(init.name, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      if (init.localStoragePersistence) {
        localStorage.setItem(`store-${init.name}`, JSON.stringify(state))
      } else {
        if (typeof localStorage[`store-${init.name}`] !== "undefined") {
          localStorage.removeItem(`store-${init.name}`)
        }
      }
    }
  }, [init.name, init.localStoragePersistence, state])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, [])
  const __actions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (args?: any) =>
            actions[key]({
              args,
              state,
              dispatch: updateState as Dispatch<SetStateAction<R>>,
            }),
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return [state, updateState, __actions as ActionsObjectType]
}

/**
 * Creates an atom containing state
 */
export function atom<R>(init: Atom<R>) {
  const useCreate = () => useAtomCreate<R>(init)
  useCreate["atom-name"] = init.name
  useCreate["init-object"] = init
  return useCreate
}
export const createAtom = atom

type useAtomType<R> = () => (
  | R
  | Dispatch<SetStateAction<R>>
  | ActionsObjectType
)[]

/**
 * Type for the `get` function of filters
 */
export type FilterGet = {
  get<R>(atom: useAtomType<R> | Atom<R>): R
}

/**
 * Filter type
 */
export type Filter<T = any> = {
  name?: string
  get(c: FilterGet): T
}

const defaultFiltersValues: any = {}

const objectFilters: any = {}

export function filter<R>(init: Filter<R | Promise<R>>) {
  const { name, get: get } = init
  const filterDeps: any = {}

  const getObject = {
    get: (atom: any) => {
      if (typeof atom !== "function") {
        filterDeps[atom.name] = true
      } else {
        filterDeps[atom["atom-name"]] = true
      }
      return typeof atom !== "function"
        ? defaultAtomsValues[atom.name]
        : defaultAtomsValues[atom["atom-name"]]
    },
  }

  const useFilterGet = () => {
    function getInitialValue() {
      return typeof defaultFiltersValues[`${name}`] === "undefined"
        ? (() => {
            return get(getObject)
          })()
        : (() => {
            return defaultFiltersValues[`${name}`]
          })()
    }
    const initialValue = getInitialValue()

    useEffect(() => {
      // Only render when using top `AtomicState` to set default filter value
      // This prevents rendering the filter twice in the first render
      if (defaultFiltersInAtomic[`${name}`]) {
        get(getObject)
      }
    }, [])

    const [filterValue, setFilterValue] = useState<R>(
      initialValue instanceof Promise || typeof initialValue === "undefined"
        ? undefined
        : (() => {
            defaultFiltersValues[`${name}`] = initialValue
            return initialValue
          })()
    )
    useEffect(() => {
      // Render the first time if initialValue is a promise
      if (initialValue instanceof Promise) {
        initialValue.then((initial) => {
          defaultFiltersValues[`${name}`] = initial
          setFilterValue(initial)
        })
      }
    }, [initialValue])

    function renderValue(e: any) {
      setTimeout(() => {
        const newValue = get(getObject)
        if (newValue instanceof Promise) {
          newValue.then((v) => {
            defaultFiltersValues[`${name}`] = newValue
            setFilterValue(v)
          })
        } else {
          defaultFiltersValues[`${name}`] = newValue
          setFilterValue(newValue)
        }
      }, 0)
    }

    useEffect(() => {
      // This renders the initial value of the filter if it was set
      // using the `AtomicState` component
      if (defaultFiltersInAtomic[`${name}`]) {
        defaultFiltersInAtomic[`${name}`] = false
        renderValue({})
      }
    }, [])

    useEffect(() => {
      for (let dep in filterDeps) {
        atomEmitters[dep]?.emitter.addListener(dep, renderValue)
      }
      return () => {
        for (let dep in filterDeps) {
          atomEmitters[dep]?.emitter.removeListener(dep, renderValue)
        }
      }
    }, [])

    return filterValue
  }
  useFilterGet["filter-name"] = name
  useFilterGet["init-object"] = init
  return useFilterGet
}

export function useFilter<T>(
  f: (() => T | Promise<T>) | Filter<T | Promise<T>>
) {
  return (
    typeof f !== "function"
      ? (() => {
          if (typeof objectFilters[`${f.name}`] === "undefined") {
            objectFilters[`${f.name}`] = filter(f)
          } else {
            if (objectFilters[`${f.name}`]["init-object"] !== f) {
              objectFilters[`${f.name}`] = filter(f)
            }
          }
          return objectFilters[`${f.name}`]()
        })()
      : f()
  ) as T
}

const objectAtoms: any = {}

/**
 * Get an atom's value and state setter
 */
export function useAtom<R>(atom: useAtomType<R> | Atom<R>) {
  if (typeof atom !== "function") {
    if (typeof objectAtoms[atom.name] === "undefined") {
      objectAtoms[atom.name] = createAtom(atom)
    } else {
      if (objectAtoms[atom.name]["init-object"] !== atom) {
        objectAtoms[atom.name] = createAtom(atom)
      }
    }
  }

  return (typeof atom !== "function" ? objectAtoms[atom.name]() : atom()) as [
    R,
    (cb: ((c: R) => R) | R) => void,
    ActionsObjectType
  ]
}

/**
 * Get an atom's value
 */
export function useValue<R>(atom: useAtomType<R> | Atom<R>) {
  return useAtom(atom)[0] as R
}
export const useAtomValue = useValue

/**
 * Get the function that updates the atom's value
 */
export function useDispatch<R>(atom: useAtomType<R> | Atom<R>) {
  return useAtom(atom)[1] as (cb: ((c: R) => R) | R) => void
}
export const useAtomDispatch = useDispatch

/**
 * Get the actions of the atom as reducers
 */
export function useActions<R>(atom: useAtomType<R> | Atom<R>) {
  return useAtom(atom)[2] as ActionsObjectType
}
export const useAtomActions = useActions

// Selectors section

// localStorage utilities for web apps

const storageEmitter = (() => {
  const emm = new EventEmitter()
  emm.setMaxListeners(10 ** 10)
  return emm
})()

export function useStorage(): {
  [key: string]: any
} {
  const [keys, setKeys] = useState({})

  async function updateStore() {
    let $keys: {
      [key: string]: any
    } = {}

    if (typeof localStorage !== "undefined") {
      for (let k in localStorage) {
        if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
          try {
            $keys[k] = JSON.parse(localStorage[k])
          } catch (err) {
            $keys[k] = localStorage[k]
          }
        }
      }
    }
    setKeys($keys)
  }

  useEffect(() => {
    updateStore()
  }, [])

  useEffect(() => {
    storageEmitter.addListener("store-changed", updateStore)
    return () => {
      storageEmitter.removeListener("store-changes", updateStore)
    }
  }, [])
  return keys
}

export const storage = {
  async set(k: string, v: any) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.setItem === "function") {
        localStorage.setItem(k, JSON.stringify(v))
        storageEmitter.emit("store-changed", v)
      }
    }
  },
  async remove(k: string) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.removeItem === "function") {
        localStorage.removeItem(k)
        storageEmitter.emit("store-changed", {})
      }
    }
  },
  get(k: string) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.getItem === "function") {
        try {
          return JSON.parse(localStorage.getItem(k) as string)
        } catch (err) {
          return ""
        }
      } else {
        try {
          return JSON.parse(localStorage[k])
        } catch (err) {
          return ""
        }
      }
    }
  },
}
