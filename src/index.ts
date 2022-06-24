/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  version,
} from "react"

import { Observervable, createObserver } from "./observable"
import {
  ActionsObjectType,
  Atom,
  Filter,
  FilterGet,
  useAtomType,
} from "./types"

export {
  Observervable,
  createObserver,
  ActionsObjectType,
  Atom,
  Filter,
  FilterGet,
  useAtomType,
}

const is18 = parseInt(version.split(".")[0]) >= 18

const atomObservables: {
  [key: string]: {
    observer: Observervable
    notify: (storeName: string, hookCall: string, payload?: any) => void
  }
} = {}

const defaultAtomsValues: any = {}
const defaultAtomsInAtomic: any = {}
const defaultFiltersInAtomic: any = {}
const usedKeys: any = {}
const defaultFiltersValues: any = {}

const atomsEffectsCleanupFunctons: any = {}

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

const resolvedAtoms: any = {}

function useAtomCreate<R, ActionsArgs>(init: Atom<R, ActionsArgs>) {
  const {
    effects = [],
    persist,
    localStoragePersistence,
    sync = true,
    onSync = () => {},
  } = init

  const [isLSReady, setIsLSReady] = useState(false)

  const persistence = localStoragePersistence || persist

  const hydration = true

  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])

  if (!(init.name in atomsEffectsCleanupFunctons)) {
    atomsEffectsCleanupFunctons[init.name] = []
  }

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

    let initVal = isDefined
      ? typeof defaultAtomsValues[init.name] === "undefined"
        ? !isPromiseValue
          ? typeof initialIfFnOrPromise !== "undefined"
            ? initialIfFnOrPromise
            : init.default
          : init.default
        : defaultAtomsValues[init.name]
      : defaultAtomsValues[init.name]

    try {
      if (persistence) {
        if (typeof localStorage !== "undefined") {
          if (
            typeof defaultAtomsValues[init.name] === "undefined" ||
            defaultAtomsInAtomic[init.name]
          ) {
            defaultAtomsInAtomic[init.name] = false
            defaultAtomsValues[init.name] = isPromiseValue
              ? undefined
              : hydration
              ? initVal
              : JSON.parse(localStorage[`store-${init.name}`] as string)
          }
        }
      } else {
        if (typeof defaultAtomsValues[init.name] === "undefined") {
          defaultAtomsValues[init.name] = initVal
        }
      }
      return persistence
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

  const [vIfPersistence, setVIfPersistence] = useState(() => {
    try {
      if (hydration) {
        return JSON.parse(localStorage[`store-${init.name}`] as string)
      } else return undefined
    } catch (err) {
      return initialValue
    }
  })

  useEffect(() => {
    async function storageListener() {
      if (typeof localStorage !== "undefined") {
        if (typeof localStorage[`store-${init.name}`] !== "undefined") {
          try {
            /**
             * We compare our atom saved in the storage with the current
             * atom value and only update our state if they are different
             *
             **/
            if (
              localStorage[`store-${init.name}`] !==
              JSON.stringify(defaultAtomsValues[init.name])
            ) {
              const newState = JSON.parse(localStorage[`store-${init.name}`])
              updateState(newState)
              await onSync(newState)
            }
            // notify(init.name, hookCall, newState)
          } catch (err) {}
        }
      }
    }
    if (persistence) {
      if (typeof window !== "undefined") {
        const canListen = typeof window.addEventListener !== "undefined"
        if (canListen) {
          if (sync) {
            window.addEventListener("storage", storageListener)
            return () => {
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

  if (!atomObservables[init.name]) {
    atomObservables[init.name] = createObserver()
  }

  const { observer, notify } = atomObservables[init.name]

  const [runEffects, setRunEffects] = useState(false)

  const hydrated = useRef(false)

  const updateState: Dispatch<SetStateAction<R>> = useCallback(
    async (v) => {
      let willCancel = false
      const newValue = typeof v === "function" ? await (v as any)(state) : v
      const hasChanded = await (async () => {
        try {
          return (
            JSON.stringify(newValue) !==
            JSON.stringify(defaultAtomsValues[init.name])
          )
        } catch (err) {
          return true
        }
      })()

      const notifyIfValueIsDefault = await (async () => {
        try {
          if (typeof defaultAtomsValues[init.name] === "function") {
            return true
          }
          if (
            JSON.stringify(newValue) === JSON.stringify(init.default) &&
            !resolvedAtoms[init.name]
          ) {
            resolvedAtoms[init.name] = true
            return true
          }
        } catch (err) {
          return true
        }
      })()

      const shouldNotifyOtherSubscribers =
        typeof defaultAtomsValues[init.name] === "function"
          ? true
          : hasChanded || notifyIfValueIsDefault

      // We first run every cleanup functions returned in atom effects
      try {
        for (let cleanupFunction of atomsEffectsCleanupFunctons[init.name]) {
          cleanupFunction()
        }
      } catch (err) {
      } finally {
        // We reset all atom cleanup functions
        atomsEffectsCleanupFunctons[init.name] = []
        try {
          if (runEffects || hydrated.current) {
            for (let effect of effects) {
              const cancelStateUpdate = (await effect({
                previous: state,
                state: newValue,
                dispatch: updateState,
              })) as unknown as boolean
              if (
                typeof cancelStateUpdate !== "undefined" &&
                !cancelStateUpdate
              ) {
                willCancel = true
              } else {
                if (typeof cancelStateUpdate === "function") {
                  atomsEffectsCleanupFunctons[init.name].push(cancelStateUpdate)
                }
              }
            }
          }
        } catch (err) {
          setRunEffects(true)
        } finally {
          if (!willCancel) {
            defaultAtomsValues[init.name] = newValue

            if (shouldNotifyOtherSubscribers) {
              notify(init.name, hookCall, newValue)
            }
            // Finally update state
            setState(newValue)
          }
        }
      }
    },
    [hookCall, notify, runEffects, hydrated, state, init.name]
  )

  useEffect(() => {
    if (typeof vIfPersistence !== "undefined") {
      if (!hydrated.current) {
        const tm1 = setTimeout(() => {
          updateState(vIfPersistence)
          setIsLSReady(true)
        }, 0)

        const tm2 = setTimeout(() => {
          setVIfPersistence(undefined)
          hydrated.current = true
        }, 0)
        return () => {
          clearTimeout(tm1)
          clearTimeout(tm2)
        }
      }
    }
  }, [vIfPersistence, updateState, hydrated])

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
              atomObservables[init.name].notify(
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
        setState(e.payload)
      }
    }

    observer.addSubscriber(init.name, handler)

    return () => {
      observer.removeSubscriber(init.name, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runEffects])

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const windowExists = typeof window !== "undefined"

      // For react native
      const isBrowserEnv = windowExists && "addEventListener" in window

      if (persistence && (isBrowserEnv ? isLSReady : true)) {
        if (
          localStorage[`store-${init.name}`] !==
          JSON.stringify(defaultAtomsValues[init.name])
        ) {
          localStorage.setItem(`store-${init.name}`, JSON.stringify(state))
        }
      } else {
        if (typeof localStorage[`store-${init.name}`] !== "undefined") {
          // Only remove from localStorage if persistence is false
          if (!persistence) {
            localStorage.removeItem(`store-${init.name}`)
          }
        }
      }
    }
  }, [init.name, persistence, state])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, [])
  const __actions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (args?: any) =>
            (actions as any)[key]({
              args,
              state,
              dispatch: updateState as Dispatch<SetStateAction<R>>,
            }),
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return [state, updateState, __actions as ActionsObjectType<ActionsArgs>]
}

const ignoredAtomKeyWarnings: any = {}

/**
 * Creates an atom containing state
 */
export function atom<R, ActionsArgs = any>(init: Atom<R, ActionsArgs>) {
  if (init.ignoreKeyWarning) {
    ignoredAtomKeyWarnings[init.name] = true
  }
  if (!ignoredAtomKeyWarnings[init.name]) {
    if (init.name in usedKeys) {
      console.warn(
        `Duplicate atom name '${init.name}' found. This could lead to bugs in atom state. To remove this warning add 'ignoreKeyWarning: true' to all atom definitions that use the name '${init.name}'.`
      )
    }
  }

  usedKeys[init.name] = true

  const useCreate = () => useAtomCreate<R, ActionsArgs>(init)
  useCreate["atom-name"] = init.name
  useCreate["init-object"] = init
  return useCreate as Atom<R, ActionsArgs>
}
export const createAtom = atom

const objectFilters: any = {}
const resolvedFilters: any = {}

const filterObservables: {
  [key: string]: {
    observer: Observervable
    notify: (storeName: string, hookCall: string, payload?: {}) => void
  }
} = {}

const subscribedFilters: any = {}

export function filter<R>(init: Filter<R | Promise<R>>) {
  const { name = "", get: get } = init
  const filterDeps: any = {}
  const depsValues: any = {}

  if (!filterObservables[name]) {
    filterObservables[name] = createObserver()
  }

  const filterObservers = filterObservables[name]

  function notifyOtherFilters(hookCall: any, payload: any) {
    filterObservers.notify(name, hookCall, payload)
  }

  const getObject = {
    get: (atom: any) => {
      if (typeof atom !== "function") {
        filterDeps[atom.name] = true
        depsValues[atom.name] = defaultAtomsValues[atom.name]
      } else {
        filterDeps[atom["atom-name"]] = true
        depsValues[atom["atom-name"]] = defaultAtomsValues[atom["atom-name"]]
      }
      return typeof atom !== "function"
        ? defaultAtomsValues[atom.name]
        : defaultAtomsValues[atom["atom-name"]]
    },
  }

  const useFilterGet = () => {
    const hookCall = useMemo(() => Math.random(), [])

    function getInitialValue() {
      try {
        resolvedFilters[`${name}`] = true
        return typeof defaultFiltersValues[`${name}`] === "undefined"
          ? init.default
          : defaultFiltersValues[`${name}`]
      } catch (err) {
        return init.default
      }
    }

    const initialValue = getInitialValue()

    useEffect(() => {
      // Whenever the filter object / function changes, add atoms deps again
      if (!subscribedFilters[name]) {
        subscribedFilters[name] = true
        get(getObject)
        for (let dep in filterDeps) {
          atomObservables[dep]?.observer.addSubscriber(dep, renderValue)
        }
        return () => {
          for (let dep in filterDeps) {
            atomObservables[dep]?.observer.removeSubscriber(dep, renderValue)
          }
        }
      }
    }, [init])

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

    async function renderValue(e: any) {
      depsValues[e.storeName] = e.payload
      try {
        const newValue = await get(getObject)
        defaultFiltersValues[`${name}`] = newValue
        if (is18) {
          setFilterValue(newValue)
        } else {
          const tm = setTimeout(() => {
            setFilterValue(newValue)
            clearTimeout(tm)
          }, 0)
        }
      } catch (err) {}
    }

    async function updateValueFromObservableChange(e: any) {
      const { storeName, payload } = e
      if (hookCall !== storeName.hookCall) {
        setFilterValue(payload)
      }
    }

    useEffect(() => {
      notifyOtherFilters(hookCall, filterValue)
    }, [filterValue])

    useEffect(() => {
      filterObservers.observer?.addSubscriber(
        name,
        updateValueFromObservableChange
      )
      return () => {
        subscribedFilters[name] = false
        resolvedFilters[name] = false
        filterObservers?.observer?.removeSubscriber(
          name,
          updateValueFromObservableChange
        )
      }
    }, [init])

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
export function useAtom<R, ActionsArgs = any>(atom: Atom<R, ActionsArgs>) {
  if (typeof atom !== "function") {
    if (typeof objectAtoms[atom.name] === "undefined") {
      objectAtoms[atom.name] = createAtom(atom)
    } else {
      if (objectAtoms[atom.name]["init-object"] !== atom) {
        objectAtoms[atom.name] = createAtom(atom)
      }
    }
  }

  return (
    typeof atom !== "function"
      ? objectAtoms[atom.name]()
      : (atom as () => void)()
  ) as [R, (cb: ((c: R) => R) | R) => void, ActionsObjectType<ActionsArgs>]
}

/**
 * Get an atom's value
 */
export function useValue<R>(atom: useAtomType<R> | Atom<R, any>) {
  return useAtom(atom)[0] as R
}
export const useAtomValue = useValue

/**
 * Get the function that updates the atom's value
 */
export function useDispatch<R>(atom: useAtomType<R> | Atom<R, any>) {
  return useAtom(atom)[1] as (cb: ((c: R) => R) | R) => void
}
export const useAtomDispatch = useDispatch

/**
 * Get the actions of the atom as reducers
 */
export function useActions<R, ActionsArgs = any>(
  atom: useAtomType<R, ActionsArgs> | Atom<R, ActionsArgs>
) {
  return useAtom(atom)[2] as ActionsObjectType<ActionsArgs>
}
export const useAtomActions = useActions

// Selectors section

// localStorage utilities for web apps

const storageOvservable = (() => {
  const emm = new Observervable()
  return emm
})()

/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
export function useStorage<K = any>(defaults?: K): K {
  const [keys, setKeys] = useState<K>((defaults || {}) as K)

  async function updateStore() {
    let $keys: any = {}

    if (typeof localStorage !== "undefined") {
      for (let k in localStorage) {
        if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
          try {
            if (typeof localStorage[k] !== "undefined") {
              $keys[k] = JSON.parse(localStorage[k])
            }
          } catch (err) {
            $keys[k] = localStorage[k]
          }
        }
      }
    }
    setKeys($keys as any)
  }

  useEffect(() => {
    updateStore()
  }, [])

  useEffect(() => {
    storageOvservable.addSubscriber("store-changed", updateStore)
    return () => {
      storageOvservable.removeSubscriber("store-changed", updateStore)
    }
  }, [])
  return keys
}

export const storage = {
  /**
   * Set an item in localStorage. Its value will be serialized as JSON
   */
  set<T = any>(k: string, v: T) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.setItem === "function") {
        localStorage.setItem(k, JSON.stringify(v))
        storageOvservable.update("store-changed", v)
      }
    }
  },
  /**
   * Remove a localStorage item
   */
  async remove(k: string) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.removeItem === "function") {
        localStorage.removeItem(k)
        storageOvservable.update("store-changed", {})
      }
    }
  },

  /**
   * Get an item in localStorage. Its value will be JSON parsed. If it does not exist or
   * is an invalid JSON format, the default value passed in the second argument will be returned
   */
  get<T = any>(k: string, def: T = null as unknown as T): T {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.getItem === "function") {
        try {
          return JSON.parse(localStorage.getItem(k) as string)
        } catch (err) {
          return def as T
        }
      } else {
        try {
          return JSON.parse(localStorage[k])
        } catch (err) {
          return def as T
        }
      }
    } else {
      return def as T
    }
  },
}

/**
 * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
 * this hook will update its state
 */
export function useStorageItem<T = any>(
  k: string,
  def: T = null as unknown as T
) {
  const [value, setValue] = useState(def)

  const itemObserver = () => {
    if (typeof localStorage !== "undefined") {
      if (JSON.stringify(localStorage[k]) !== JSON.stringify(def)) {
        try {
          setValue(JSON.parse(localStorage[k]))
        } catch (err) {
          setValue(def)
        }
      }
    }
  }

  useEffect(() => {
    itemObserver()
    storageOvservable.addSubscriber("store-changed", itemObserver)
    return () => {
      storageOvservable.removeSubscriber("store-changed", itemObserver)
    }
  }, [])

  return value
}
