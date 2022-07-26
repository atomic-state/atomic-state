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
} from "react"

import { EventEmitter as Observable } from "events"

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
    /**
     * Cancel the new state update
     */
    cancel: () => void
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

export function createObserver() {
  const observer = new Observable()
  observer.setMaxListeners(10e10)
  function notify(storeName: string, hookCall: string, payload: any) {
    observer.emit(storeName, { storeName, hookCall, payload })
  }
  return {
    observer: observer,
    notify,
  }
}

const atomObservables: {
  [key: string]: {
    observer: Observable
    notify: (storeName: string, hookCall: string, payload?: any) => void
  }
} = {}

const defaultAtomsValues: any = {}
const atomsInitializeObjects: any = {}
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

function AtomInitialize({ atm }: any) {
  const used = useAtom(atm)
  return null
}

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

  const createdAtoms = Object.values(atomsInitializeObjects) as any

  const initialized = useMemo(
    () =>
      createdAtoms.map((atm: any) => {
        return <AtomInitialize key={atm?.name + prefix} atm={atm} />
      }),
    []
  )

  return (
    <atomicStateContext.Provider
      value={{
        prefix: atomicPrefix,
      }}
    >
      {initialized}
      {children}
    </atomicStateContext.Provider>
  )
}

const resolvedAtoms: any = {}

const persistenceLoaded: any = {}
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
            defaultAtomsValues[$atomKey] = isPromiseValue ? undefined : initVal
          }
        }
      } else {
        if (typeof defaultAtomsValues[$atomKey] === "undefined") {
          defaultAtomsValues[$atomKey] = initVal
        }
      }
      return initVal
    } catch (err) {
      return initVal
    }
  })()

  const [vIfPersistence, setVIfPersistence] = useState(() => {
    try {
      return (async () => {
        const storageItem =
          typeof localStorage === "undefined"
            ? init.default
            : await localStorage.getItem($atomKey)
        return typeof localStorage === "undefined"
          ? init.default
          : JSON.parse(storageItem as any) || init.default
      })()
    } catch (err) {
      return initialValue
    }
  })

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
    (v: any) => {
      let willCancel = false
      let newValue: any
      let hasChanded

      function cancelUpdate() {
        willCancel = true
      }
      newValue = typeof v === "function" ? (v as any)(state) : v
      hasChanded = (() => {
        try {
          return (
            JSON.stringify(newValue) !==
            JSON.stringify(defaultAtomsValues[$atomKey])
          )
        } catch (err) {
          return false
        }
      })()

      const notifyIfValueIsDefault = (() => {
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
          for (let effect of effects) {
            const cancelStateUpdate = effect({
              previous: state,
              state: newValue,
              dispatch: updateState,
              cancel: cancelUpdate,
            }) as unknown as boolean | Promise<any>

            if (cancelStateUpdate instanceof Promise) {
              cancelStateUpdate.then((r) => {
                if (typeof r !== "undefined" && !r) {
                  willCancel = true
                } else {
                  if (typeof r === "function") {
                    atomsEffectsCleanupFunctons[$atomKey].push(r)
                  }
                }
              })
            } else if (
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
        } catch (err) {
          setRunEffects(true)
        } finally {
          if (!willCancel) {
            defaultAtomsValues[$atomKey] = newValue
            if (persistence) {
              localStorage.setItem($atomKey, JSON.stringify(newValue))
            }
            try {
              if (shouldNotifyOtherSubscribers) {
                notify($atomKey, hookCall, newValue)
              }
            } finally {
              // Finally update state
              setState(newValue)
            }
          }
        }
      }
    },
    [hookCall, notify, runEffects, hydrated, state, init.name]
  ) as Dispatch<SetStateAction<R>>

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

  useEffect(() => {
    async function loadPersistence() {
      persistenceLoaded[$atomKey] = true
      if (typeof vIfPersistence !== "undefined") {
        if (!hydrated.current) {
          const tm1 = setTimeout(async () => {
            if (persistence) {
              const storageItem = await vIfPersistence
              if (
                JSON.stringify(storageItem) !==
                JSON.stringify(defaultAtomsValues[$atomKey])
              ) {
                if (!resolvedAtoms[$atomKey]) {
                  updateState(storageItem)
                }
              }
              setIsLSReady(true)
            }
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
    }
    if (!persistenceLoaded[$atomKey]) {
      loadPersistence()
    }
  }, [vIfPersistence, updateState, hydrated, $atomKey])

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

    observer.addListener($atomKey, handler)

    return () => {
      observer.removeListener($atomKey, handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runEffects])

  useEffect(() => {
    async function updateStorage() {
      if (typeof localStorage !== "undefined") {
        const storageItem = await localStorage.getItem($atomKey)
        if (typeof storageItem !== "undefined" || storageItem === null) {
          // Only remove from localStorage if persistence is false
          if (!persistence) {
            localStorage.removeItem($atomKey)
          }
        }
      }
    }
    updateStorage()
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
  ;() => {
    if (!ignoredAtomKeyWarnings[init.name]) {
      if (init.name in usedKeys) {
        console.warn(
          `Duplicate atom name '${init.name}' found. This could lead to bugs in atom state. To remove this warning add 'ignoreKeyWarning: true' to all atom definitions that use the name '${init.name}'.`
        )
      }
    }
  }

  usedKeys[init.name] = true

  if (!atomsInitializeObjects[init?.name]) {
    atomsInitializeObjects[init?.name] = init
  }

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
    observer: Observable
    notify: (storeName: string, hookCall: string, payload?: {}) => void
  }
} = {}

const subscribedFilters: any = {}

export function filter<R>(init: Filter<R | Promise<R>>) {
  const { name = "", get } = init

  let filterDeps: any = {}

  let $resolving: any = {}

  const useFilterGet = () => {
    let depsValues: any = {}
    let readFilters: any = {}
    ;(useFilterGet as any)["deps"] = {}

    const { prefix } = useContext(atomicStateContext)

    if (!filterDeps[`${prefix}-`]) {
      filterDeps[`${prefix}-`] = {}
    }

    const $filterKey = prefix + "-" + name

    if (!filterObservables[$filterKey]) {
      filterObservables[$filterKey] = createObserver()
    }

    const filterObserver = filterObservables[$filterKey]

    const notifyOtherFilters = useCallback(
      function notifyOtherFilters(hookCall: any, payload: any) {
        filterObserver.notify($filterKey, hookCall, payload)
      },
      [prefix, $filterKey]
    )

    const getObject = useMemo(
      () => ({
        get: (atom: any) => {
          if (typeof atom !== "function") {
            filterDeps[`${prefix}-`][`${prefix}-${atom.name}`] = true
            depsValues[`${prefix}-${atom.name}`] =
              defaultAtomsValues[`${prefix}-${atom.name}`]
            ;(useFilterGet as any)["deps"] = {
              ...(useFilterGet as any)["deps"],
              [`${prefix}-${atom.name}`]: true,
            }
          } else {
            filterDeps[`${prefix}-`][`${prefix}-${atom["atom-name"]}`] = true
            depsValues[`${prefix}-${atom["atom-name"]}`] =
              defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
            ;(useFilterGet as any)["deps"] = {
              ...(useFilterGet as any)["deps"],
              [`${prefix}-${atom["atom-name"]}`]: true,
            }
          }
          return typeof atom !== "function"
            ? typeof defaultAtomsValues[`${prefix}-${atom.name}`] ===
              "undefined"
              ? atom.default
              : defaultAtomsValues[`${prefix}-${atom.name}`]
            : typeof defaultAtomsValues[`${prefix}-${atom["atom-name"]}`] ===
              "undefined"
            ? atom["init-object"].default
            : defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
        },
        read: ($filter: any) => {
          if (typeof $filter !== "function") {
            readFilters[`${prefix}-${$filter.name}`] = true
          } else {
            // We want any re-renders from filters used to trigger a re-render of the current filter
            readFilters[`${prefix}-${$filter["filter-name"]}`] = true
          }

          return typeof $filter !== "function"
            ? typeof defaultFiltersValues[`${prefix}-${$filter.name}`] ===
              "undefined"
              ? $filter.default
              : defaultFiltersValues[`${prefix}-${$filter.name}`]
            : typeof defaultFiltersValues[
                `${prefix}-${$filter["filter-name"]}`
              ] === "undefined"
            ? $filter["init-object"]?.default
            : defaultFiltersValues[`${prefix}-${$filter["filter-name"]}`]
        },
      }),
      [prefix]
    )

    const hookCall = useMemo(() => Math.random(), [])

    function getInitialValue() {
      try {
        return !resolvedFilters[$filterKey]
          ? (() => {
              resolvedFilters[$filterKey] = true
              defaultFiltersValues[$filterKey] = init.default
              let firstResolved
              try {
                firstResolved = get(getObject)
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
              return defaultFiltersValues[$filterKey]
            })()
      } catch (err) {
        return init.default
      }
    }

    const initialValue = getInitialValue()

    const [filterValue, setFilterValue] = useState<R>(
      initialValue instanceof Promise || typeof initialValue === "undefined"
        ? init.default
        : (() => {
            defaultFiltersValues[$filterKey] = initialValue
            return initialValue
          })()
    )

    useEffect(() => {
      if (!resolvedFilters[$filterKey]) {
        notifyOtherFilters(hookCall, filterValue)
      }
    }, [filterValue, $filterKey])

    useEffect(() => {
      // Render the first time if initialValue is a promise
      if (initialValue instanceof Promise) {
        initialValue.then((initial) => {
          defaultFiltersValues[$filterKey] = initial
          setFilterValue(initial)
        })
      }
    }, [initialValue])

    useEffect(() => {
      return () => {
        resolvedFilters[$filterKey] = false
      }
    }, [])

    async function renderValue(e: any) {
      if (
        typeof e.payload === "function"
          ? true
          : JSON.stringify(e.payload) !==
            JSON.stringify(depsValues[e.storeName])
      ) {
        if (e.storeName in filterDeps[`${prefix}-`]) {
          depsValues[e.storeName] = e.payload
        }

        try {
          if (!$resolving[$filterKey]) {
            $resolving[$filterKey] = true
            const tm = setTimeout(async () => {
              const newValue =
                e.storeName in filterDeps[`${prefix}-`] ||
                e.storeName in readFilters
                  ? await get(getObject)
                  : defaultFiltersValues[$filterKey]

              defaultFiltersValues[$filterKey] = newValue
              notifyOtherFilters(hookCall, newValue)

              setFilterValue(newValue)
              $resolving[$filterKey] = false
              clearTimeout(tm)
            }, 0)
          }
        } catch (err) {}
      }
    }

    useEffect(() => {
      // Whenever the filter object / function changes, add atoms deps again
      if (!subscribedFilters[$filterKey]) {
        subscribedFilters[$filterKey] = true
        if (!resolvedFilters[$filterKey]) {
          get(getObject)
        }
        for (let dep in filterDeps[`${prefix}-`]) {
          atomObservables[dep]?.observer.addListener(dep, renderValue)
        }

        // We subscribe to any re-renders of filters that our current
        // filter is using
        for (let readFilter in readFilters) {
          filterObservables[readFilter]?.observer.addListener(
            readFilter,
            renderValue
          )
        }

        return () => {
          defaultFiltersInAtomic[$filterKey] = true
          for (let dep in filterDeps[`${prefix}-`]) {
            atomObservables[dep]?.observer.removeListener(dep, renderValue)
          }

          for (let readFilter in readFilters) {
            filterObservables[readFilter]?.observer.removeListener(
              readFilter,
              renderValue
            )
          }
        }
      }
    }, [init, prefix])

    async function updateValueFromObservableChange(e: any) {
      const { storeName, payload } = e
      if (hookCall !== e.hookCall) {
        setFilterValue(payload)
      }
    }

    useEffect(() => {
      filterObserver.observer?.addListener(
        $filterKey,
        updateValueFromObservableChange
      )
      return () => {
        subscribedFilters[$filterKey] = false
        // resolvedFilters[$filterKey] = false
        filterObserver?.observer?.removeListener(
          $filterKey,
          updateValueFromObservableChange
        )
      }
    }, [init, prefix, filterValue])

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
  const emm = new Observable()
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
    storageOvservable.addListener("store-changed", updateStore)
    return () => {
      storageOvservable.removeListener("store-changed", updateStore)
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
        storageOvservable.emit("store-changed", v)
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
        storageOvservable.emit("store-changed", {})
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
    storageOvservable.addListener("store-changed", itemObserver)
    return () => {
      storageOvservable.removeListener("store-changed", itemObserver)
    }
  }, [])

  return value
}
