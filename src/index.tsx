/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
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

const atomicStateContext = createContext<{
  prefix: string
}>({
  prefix: "store",
})

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
  /**
   * The prefix added to atoms inside this component
   */
  prefix?: string
}> = ({ children, atoms, filters, prefix = "store" }) => {
  const atomicContext = useContext(atomicStateContext)

  let atomicPrefix =
    typeof prefix === "undefined" ? atomicContext.prefix : prefix

  if (atoms) {
    for (let atomKey in atoms) {
      if (
        typeof defaultAtomsValues[`${atomicPrefix}-${atomKey}`] === "undefined"
      ) {
        defaultAtomsValues[`${atomicPrefix}-${atomKey}`] = atoms[atomKey]
        defaultAtomsInAtomic[`${atomicPrefix}-${atomKey}`] = true
      }
    }
  }
  if (filters) {
    for (let filterKey in filters) {
      if (
        typeof defaultFiltersValues[`${atomicPrefix}-${filterKey}`] ===
        "undefined"
      ) {
        defaultFiltersValues[`${atomicPrefix}-${filterKey}`] =
          filters[filterKey]
        defaultFiltersInAtomic[`${atomicPrefix}-${filterKey}`] = true
      }
    }
  }

  const memoizedChildren = useMemo(() => children, [prefix])

  return (
    <atomicStateContext.Provider
      value={{
        prefix: atomicPrefix,
      }}
    >
      {children}
    </atomicStateContext.Provider>
  )
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

  const { prefix } = useContext(atomicStateContext)

  const $atomKey = prefix + "-" + init.name

  const [isLSReady, setIsLSReady] = useState(false)

  const persistence = localStoragePersistence || persist

  const hydration = true

  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])

  if (!($atomKey in atomsEffectsCleanupFunctons)) {
    atomsEffectsCleanupFunctons[$atomKey] = []
  }

  const isDefined = typeof init.default !== "undefined"

  const initialValue = (function getInitialValue() {
    const isFunction =
      typeof defaultAtomsValues[$atomKey] === "undefined" &&
      typeof init.default === "function"

    const initialIfFnOrPromise = isFunction
      ? (init.default as any)()
      : init.default instanceof Promise
      ? init.default
      : undefined

    const isPromiseValue = initialIfFnOrPromise instanceof Promise

    let initVal = isDefined
      ? typeof defaultAtomsValues[$atomKey] === "undefined"
        ? !isPromiseValue
          ? typeof initialIfFnOrPromise !== "undefined"
            ? initialIfFnOrPromise
            : init.default
          : init.default
        : defaultAtomsValues[$atomKey]
      : defaultAtomsValues[$atomKey]

    try {
      if (persistence) {
        if (typeof localStorage !== "undefined") {
          if (
            typeof defaultAtomsValues[$atomKey] === "undefined" ||
            defaultAtomsInAtomic[$atomKey]
          ) {
            defaultAtomsInAtomic[$atomKey] = false
            defaultAtomsValues[$atomKey] = isPromiseValue
              ? undefined
              : hydration
              ? initVal
              : JSON.parse(localStorage[$atomKey] as string)
          }
        }
      } else {
        if (typeof defaultAtomsValues[$atomKey] === "undefined") {
          defaultAtomsValues[$atomKey] = initVal
        }
      }
      return persistence
        ? typeof localStorage !== "undefined"
          ? typeof localStorage[$atomKey] !== "undefined"
            ? // Only return value from localStorage if not loaded to memory
              defaultAtomsValues[$atomKey]
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
        return JSON.parse(localStorage[$atomKey] as string)
      } else return undefined
    } catch (err) {
      return initialValue
    }
  })

  useEffect(() => {
    async function storageListener() {
      if (typeof localStorage !== "undefined") {
        if (typeof localStorage[$atomKey] !== "undefined") {
          try {
            /**
             * We compare our atom saved in the storage with the current
             * atom value and only update our state if they are different
             *
             **/
            if (
              localStorage[$atomKey] !==
              JSON.stringify(defaultAtomsValues[$atomKey])
            ) {
              const newState = JSON.parse(localStorage[$atomKey])
              updateState(newState)
              await onSync(newState)
            }
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
      typeof defaultAtomsValues[$atomKey] === "undefined"
      ? undefined
      : (() => {
          defaultAtomsValues[$atomKey] = initialValue
          return initialValue
        })()
  )

  if (!pendingAtoms[$atomKey]) {
    pendingAtoms[$atomKey] = 0
  }

  if (!atomObservables[$atomKey]) {
    atomObservables[$atomKey] = createObserver()
  }

  const { observer, notify } = atomObservables[$atomKey]

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
            JSON.stringify(defaultAtomsValues[$atomKey])
          )
        } catch (err) {
          return false
        }
      })()

      const notifyIfValueIsDefault = await (async () => {
        try {
          if (typeof defaultAtomsValues[$atomKey] === "function") {
            return true
          }
          if (
            JSON.stringify(newValue) === JSON.stringify(init.default) &&
            !resolvedAtoms[$atomKey]
          ) {
            resolvedAtoms[$atomKey] = true
            return true
          }
        } catch (err) {
          return true
        }
      })()

      const shouldNotifyOtherSubscribers =
        typeof defaultAtomsValues[$atomKey] === "function"
          ? true
          : hasChanded || notifyIfValueIsDefault

      // We first run every cleanup functions returned in atom effects
      try {
        for (let cleanupFunction of atomsEffectsCleanupFunctons[$atomKey]) {
          cleanupFunction()
        }
      } catch (err) {
      } finally {
        // We reset all atom cleanup functions
        atomsEffectsCleanupFunctons[$atomKey] = []
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
                  atomsEffectsCleanupFunctons[$atomKey].push(cancelStateUpdate)
                }
              }
            }
          }
        } catch (err) {
          setRunEffects(true)
        } finally {
          if (!willCancel) {
            defaultAtomsValues[$atomKey] = newValue

            if (shouldNotifyOtherSubscribers) {
              notify($atomKey, hookCall, newValue)
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
      if (typeof defaultAtomsValues[$atomKey] === "undefined") {
        if (typeof init.default === "function") {
          if (pendingAtoms[$atomKey] === 0) {
            pendingAtoms[$atomKey] += 1
            let v =
              typeof init.default !== "undefined"
                ? (async () =>
                    typeof init.default === "function"
                      ? (init.default as () => Promise<R>)()
                      : init.default)()
                : undefined
            if (typeof v !== "undefined") {
              v.then((val) => {
                defaultAtomsValues[$atomKey] = val
                notify($atomKey, hookCall, defaultAtomsValues[$atomKey])
                updateState(val as R)
              })
            }
          } else {
            pendingAtoms[$atomKey] += 1
            if (state || defaultAtomsValues[$atomKey]) {
              atomObservables[$atomKey]?.notify(
                $atomKey,
                hookCall,
                typeof state !== "undefined"
                  ? state
                  : defaultAtomsValues[$atomKey]
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
      pendingAtoms[$atomKey] = 0
    }
  }, [init.name])

  useEffect(() => {
    const handler = async (e: any) => {
      if (e.hookCall !== hookCall) {
        setState(e.payload)
      }
    }

    observer.addSubscriber($atomKey, handler)

    return () => {
      observer.removeSubscriber($atomKey, handler)
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
          localStorage[$atomKey] !==
          JSON.stringify(defaultAtomsValues[$atomKey])
        ) {
          localStorage.setItem($atomKey, JSON.stringify(state))
        }
      } else {
        if (typeof localStorage[$atomKey] !== "undefined") {
          // Only remove from localStorage if persistence is false
          if (!persistence) {
            localStorage.removeItem($atomKey)
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

  const useFilterGet = () => {
    const filterDeps: any = {}
    const depsValues: any = {}

    const { prefix } = useContext(atomicStateContext)

    const $filterKey = prefix + "-" + name

    if (!filterObservables[$filterKey]) {
      filterObservables[$filterKey] = createObserver()
    }

    const filterObserver = filterObservables[$filterKey]

    const notifyOtherFilters = useCallback(
      function notifyOtherFilters(hookCall: any, payload: any) {
        filterObserver.notify($filterKey, hookCall, payload)
      },
      [prefix]
    )

    const getObject = useMemo(
      () => ({
        get: (atom: any) => {
          if (typeof atom !== "function") {
            filterDeps[`${prefix}-${atom.name}`] = true
            depsValues[`${prefix}-${atom.name}`] =
              defaultAtomsValues[`${prefix}-${atom.name}`]
          } else {
            filterDeps[`${prefix}-${atom["atom-name"]}`] = true
            depsValues[`${prefix}-${atom["atom-name"]}`] =
              defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
          }
          return typeof atom !== "function"
            ? defaultAtomsValues[`${prefix}-${atom.name}`]
            : defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
        },
      }),
      [prefix]
    )

    const hookCall = useMemo(() => Math.random(), [])

    function getInitialValue() {
      try {
        return typeof defaultFiltersValues[$filterKey] === "undefined" &&
          !defaultFiltersInAtomic[$filterKey]
          ? (() => {
              defaultFiltersValues[$filterKey] = init.default
              let firstResolved
              try {
                firstResolved = get(getObject)
                resolvedFilters[$filterKey] = true
                if (typeof firstResolved === "undefined") {
                  return init.default
                } else {
                  ;(async () => {
                    defaultFiltersValues[$filterKey] = await firstResolved
                  })()
                }
              } catch (err) {
              } finally {
                return firstResolved
              }
            })()
          : (() => {
              // We finally notify other filters that this value is ready
              const tm = setTimeout(() => {
                notifyOtherFilters(hookCall, defaultFiltersValues[$filterKey])
                clearTimeout(tm)
              }, 0)
              return defaultFiltersValues[$filterKey]
            })()
      } catch (err) {
        return init.default
      }
    }

    const initialValue = getInitialValue()

    useEffect(() => {
      // Whenever the filter object / function changes, add atoms deps again
      if (!subscribedFilters[$filterKey]) {
        subscribedFilters[$filterKey] = true
        if (defaultFiltersInAtomic[$filterKey]) {
          get(getObject)
        }
        for (let dep in filterDeps) {
          atomObservables[dep]?.observer.addSubscriber(dep, renderValue)
        }
        return () => {
          defaultFiltersInAtomic[$filterKey] = true
          for (let dep in filterDeps) {
            atomObservables[dep]?.observer.removeSubscriber(dep, renderValue)
          }
        }
      }
    }, [init, prefix])

    const [filterValue, setFilterValue] = useState<R>(
      initialValue instanceof Promise || typeof initialValue === "undefined"
        ? init.default
        : (() => {
            defaultFiltersValues[$filterKey] = initialValue
            return initialValue
          })()
    )
    useEffect(() => {
      // Render the first time if initialValue is a promise
      if (initialValue instanceof Promise) {
        initialValue.then((initial) => {
          defaultFiltersValues[$filterKey] = initial
          setFilterValue(initial)
        })
      }
    }, [initialValue])

    async function renderValue(e: any) {
      if (
        typeof e.payload === "function"
          ? true
          : JSON.stringify(e.payload) !==
            JSON.stringify(depsValues[`${e.storeName}`])
      ) {
        depsValues[`${e.storeName}`] = e.payload
        try {
          const newValue = await get(getObject)
          defaultFiltersValues[$filterKey] = newValue
          const tm = setTimeout(() => {
            setFilterValue(newValue)
            notifyOtherFilters(hookCall, newValue)
            clearTimeout(tm)
          }, 0)
        } catch (err) {}
      }
    }

    async function updateValueFromObservableChange(e: any) {
      const { storeName, payload } = e
      if (hookCall !== e.hookCall) {
        setFilterValue(payload)
      }
    }

    useEffect(() => {
      filterObserver.observer?.addSubscriber(
        $filterKey,
        updateValueFromObservableChange
      )
      return () => {
        subscribedFilters[$filterKey] = false
        resolvedFilters[$filterKey] = false
        filterObserver?.observer?.removeSubscriber(
          $filterKey,
          updateValueFromObservableChange
        )
      }
    }, [init, prefix])

    return filterValue
  }
  useFilterGet["filter-name"] = name
  useFilterGet["init-object"] = init
  return useFilterGet
}

export function useFilter<T>(
  f: (() => T | Promise<T>) | Filter<T | Promise<T>>
) {
  const { prefix } = useContext(atomicStateContext)
  return (
    typeof f !== "function"
      ? (() => {
          if (typeof objectFilters[`${prefix}-${f.name}`] === "undefined") {
            objectFilters[`${prefix}-${f.name}`] = filter(f)
          } else {
            if (objectFilters[`${prefix}-${f.name}`]["init-object"] !== f) {
              objectFilters[`${prefix}-${f.name}`] = filter(f)
            }
          }
          return objectFilters[`${prefix}-${f.name}`]()
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
