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

export type ActionType<Args, T = any> = (
  args: {
    args: Args
    state: T
    dispatch: Dispatch<SetStateAction<T>>
  } & FilterGet
) => void

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
   * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
   *
   * @default localStorage
   */
  persistenceProvider?: PersistenceStoreType
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
    [E in keyof Partial<ActionArgs>]: ActionType<ActionArgs[E], T>
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
  [E in keyof ArgsTypes]: <Returns = any>(args?: ArgsTypes[E]) => Returns
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
  get(c: FilterGet): T | Promise<T>
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
const filtersInitializeObjects: any = {}
const defaultAtomsInAtomic: any = {}
const defaultFiltersInAtomic: any = {}
const usedKeys: any = {}
const defaultFiltersValues: any = {}

const atomsEffectsCleanupFunctons: any = {}

const pendingAtoms: any = {}

export type PersistenceStoreType = {
  getItem: (key: string) => any
  setItem: (key: string, value: any) => void
  removeItem: (key: string) => void
}

const defaultPersistenceProvider =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem() {},
        setItem() {},
        removeItem() {},
      }

const atomicStateContext = createContext<{
  prefix: string
  persistenceProvider: PersistenceStoreType
}>({
  prefix: "store",
  persistenceProvider: defaultPersistenceProvider,
})

function AtomInitialize({ atm }: any) {
  useAtom(atm)
  return null
}

function FilterInitialize({ filt }: any) {
  useFilter(filt)
  return null
}

function _isDefined(target: any) {
  return typeof target !== "undefined"
}

function _isFunction(target: any) {
  return typeof target === "function"
}

function _isPromise(target: any) {
  return target instanceof Promise
}

function jsonEquality(target1: any, target2: any) {
  return JSON.stringify(target1) === JSON.stringify(target2)
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
  /**
   * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
   *
   * @default localStorage
   */
  persistenceProvider?: PersistenceStoreType
}> = ({
  children,
  atoms,
  filters,
  prefix = "store",
  persistenceProvider = defaultPersistenceProvider,
}) => {
  const atomicContext = useContext(atomicStateContext)

  let atomicPrefix = !_isDefined(prefix) ? atomicContext.prefix : prefix

  if (atoms) {
    for (let atomKey in atoms) {
      const defaultsKey = `${atomicPrefix}-${atomKey}`
      if (!_isDefined(defaultAtomsValues[defaultsKey])) {
        defaultAtomsValues[defaultsKey] = atoms[atomKey]
        defaultAtomsInAtomic[defaultsKey] = true
      }
    }
  }
  if (filters) {
    for (let filterKey in filters) {
      const defaultsKey = `${atomicPrefix}-${filterKey}`
      if (!_isDefined(defaultFiltersValues[defaultsKey])) {
        defaultFiltersValues[defaultsKey] = filters[filterKey]
        defaultFiltersInAtomic[defaultsKey] = true
      }
    }
  }

  const createdAtoms = Object.values(atomsInitializeObjects) as any

  const thisId = useMemo(() => Math.random(), []).toString()

  const initialized = useMemo(
    () =>
      createdAtoms.map((atm: any) => {
        return (
          <React.StrictMode key={atm?.name + prefix + thisId}>
            <AtomInitialize atm={atm} />
          </React.StrictMode>
        )
      }),
    [createdAtoms]
  )

  const createdFilters = Object.values(filtersInitializeObjects) as any

  const initializedFilters = useMemo(
    () =>
      createdFilters.map((flt: any) => {
        return (
          <React.StrictMode key={flt?.name + prefix + thisId}>
            <FilterInitialize filt={flt} />
          </React.StrictMode>
        )
      }),
    [createdFilters]
  )

  return (
    <atomicStateContext.Provider
      value={{
        prefix: atomicPrefix,
        persistenceProvider,
      }}
    >
      <>
        {initialized}
        {initializedFilters}
      </>

      {children}
    </atomicStateContext.Provider>
  )
}

const resolvedAtoms: any = {}

const persistenceLoaded: any = {}

/**
 * Take a snapshot of all atoms' and filters' values.
 * You can pass a string with the `prefix` you used in the `AtomicState` root component
 * if you want only atoms and filters using that prefix.
 */
export function takeSnapshot(storeName?: string) {
  let stores: any = {}

  for (let atomKey in defaultAtomsValues) {
    const [prefixName, atomName] = atomKey.split("-")
    if (!_isDefined(stores[prefixName])) {
      stores[prefixName] = {
        filters: {},
        atoms: {},
      }
    }
    stores[prefixName].atoms[atomName] = defaultAtomsValues[atomKey]
  }

  for (let filterKey in defaultFiltersValues) {
    const [prefixName, filterName] = filterKey.split("-")
    if (!_isDefined(stores[prefixName])) {
      stores[prefixName] = {
        filters: {},
        atoms: {},
      }
    }
    stores[prefixName].filters[filterName] = defaultFiltersValues[filterKey]
  }
  return !_isDefined(storeName) ? stores : stores[storeName as any] || {}
}

/**
 * Get the current value of an atom. You can pass a specific prefix as the second argument.
 */
export function getAtomValue<T = any>(atomName: string, prefix = "store") {
  const $atomKey = [prefix, atomName].join("-")
  return defaultAtomsValues[$atomKey]
}

/**
 * Get the current value of a filter. You can pass a specific prefix as the second argument.
 */
export function getFilterValue<T = any>(filterName: string, prefix = "store") {
  const $filterKey = [prefix, filterName].join("-")
  return defaultFiltersValues[$filterKey]
}

function useAtomCreate<R, ActionsArgs>(init: Atom<R, ActionsArgs>) {
  const { prefix, persistenceProvider } = useContext(atomicStateContext)

  const {
    effects = [],
    persist,
    localStoragePersistence,
    sync = true,
    onSync = () => {},
    persistenceProvider: $localStorage = persistenceProvider,
  } = init

  const $atomKey = prefix + "-" + init.name

  const [isLSReady, setIsLSReady] = useState(false)

  const persistence = localStoragePersistence || persist

  const hookCall = useMemo(() => `${Math.random()}`.split(".")[1], [])

  if (!($atomKey in atomsEffectsCleanupFunctons)) {
    atomsEffectsCleanupFunctons[$atomKey] = []
  }

  const isDefined = _isDefined(init.default)

  const initDef = _isDefined(defaultAtomsValues[$atomKey])
    ? defaultAtomsValues[$atomKey]
    : init.default

  const initialValue = (function getInitialValue() {
    const isFunction =
      !_isDefined(defaultAtomsValues[$atomKey]) && _isFunction(init.default)

    const initialIfFnOrPromise = isFunction
      ? (init.default as any)()
      : _isPromise(init.default)
      ? init.default
      : undefined

    const isPromiseValue = _isPromise(initialIfFnOrPromise)

    let initVal = isDefined
      ? !_isDefined(defaultAtomsValues[$atomKey])
        ? !isPromiseValue
          ? _isDefined(initialIfFnOrPromise)
            ? initialIfFnOrPromise
            : initDef
          : init.default
        : initDef
      : initDef

    try {
      if (persistence) {
        if (typeof localStorage !== "undefined") {
          if (
            !_isDefined(defaultAtomsValues[$atomKey]) ||
            defaultAtomsInAtomic[$atomKey]
          ) {
            defaultAtomsInAtomic[$atomKey] = false
            defaultAtomsValues[$atomKey] = isPromiseValue ? undefined : initVal
          }
        }
      } else {
        if (!_isDefined(defaultAtomsValues[$atomKey])) {
          defaultAtomsValues[$atomKey] = initVal
        }
      }
      return initVal
    } catch (err) {
      return initVal
    }
  })()

  const [vIfPersistence, setVIfPersistence] = useState(() => {
    if (persist) {
      if (typeof window !== "undefined") {
        try {
          return (async () => {
            const storageItem =
              typeof $localStorage === "undefined"
                ? init.default
                : await $localStorage.getItem($atomKey)
            return typeof $localStorage === "undefined"
              ? init.default
              : JSON.parse(storageItem as any) || initDef
          })()
        } catch (err) {
          return initialValue
        }
      }
    } else return undefined
  })

  const [state, setState] = useState<R>(
    (_isPromise(initialValue) || _isFunction(initialValue)) &&
      !_isDefined(defaultAtomsValues[$atomKey])
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
      newValue = _isFunction(v) ? (v as any)(defaultAtomsValues[$atomKey]) : v
      hasChanded = (() => {
        try {
          return !jsonEquality(newValue, defaultAtomsValues[$atomKey])
        } catch (err) {
          return false
        }
      })()

      const notifyIfValueIsDefault = (() => {
        try {
          if (_isFunction(defaultAtomsValues[$atomKey])) {
            return true
          }
          if (jsonEquality(newValue, initDef) && !resolvedAtoms[$atomKey]) {
            resolvedAtoms[$atomKey] = true
            return true
          } else {
            return false
          }
        } catch (err) {
          return true
        }
      })()

      const shouldNotifyOtherSubscribers =
        _isFunction(defaultAtomsValues[$atomKey]) ||
        hasChanded ||
        notifyIfValueIsDefault

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

            if (_isPromise(cancelStateUpdate)) {
              ;(cancelStateUpdate as any).then((r: any) => {
                if (_isDefined(r) && !r) {
                  willCancel = true
                } else {
                  if (_isFunction(r)) {
                    atomsEffectsCleanupFunctons[$atomKey].push(r)
                  }
                }
              })
            } else if (_isDefined(cancelStateUpdate) && !cancelStateUpdate) {
              willCancel = true
            } else {
              if (_isFunction(cancelStateUpdate)) {
                atomsEffectsCleanupFunctons[$atomKey].push(cancelStateUpdate)
              }
            }
          }
        } catch (err) {
          setRunEffects(true)
        } finally {
          if (!willCancel) {
            if (_isDefined(newValue)) {
              defaultAtomsValues[$atomKey] = newValue
              if (persistence) {
                $localStorage.setItem($atomKey, JSON.stringify(newValue))
              }
            }
            try {
              if (shouldNotifyOtherSubscribers) {
                if (_isDefined(newValue)) {
                  notify($atomKey, hookCall, newValue)
                }
              }
            } finally {
              // Finally update state
              if (_isDefined(newValue)) {
                setState(newValue)
              }
            }
          }
        }
      }
    },
    [
      hookCall,
      notify,
      runEffects,
      $atomKey,
      persistence,
      hydrated,
      state,
      init.name,
    ]
  ) as Dispatch<SetStateAction<R>>

  useEffect(() => {
    async function storageListener() {
      if (typeof localStorage !== "undefined") {
        if (_isDefined(localStorage[$atomKey])) {
          try {
            const newState = JSON.parse(localStorage[$atomKey])
            /**
             * We compare our atom saved in the storage with the current
             * atom value and only update our state if they are different
             *
             **/
            if (!jsonEquality(newState, defaultAtomsValues[$atomKey])) {
              updateState(newState)
              await onSync(newState)
            }
          } catch (err) {}
        }
      }
    }
    if (persistence) {
      if (typeof window !== "undefined") {
        if ($localStorage === localStorage) {
          const canListen = _isDefined(window.addEventListener)
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
    }
    return () => {}
  }, [init.name, persistence, $localStorage])

  useEffect(() => {
    async function loadPersistence() {
      persistenceLoaded[$atomKey] = true
      if (_isDefined(vIfPersistence)) {
        if (!hydrated.current) {
          const tm1 = setTimeout(async () => {
            if (persistence) {
              const storageItem = await vIfPersistence
              if (!jsonEquality(storageItem, defaultAtomsValues[$atomKey])) {
                if (!_isDefined(resolvedAtoms[$atomKey])) {
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
      return () => {}
    }
    if (!persistenceLoaded[$atomKey]) {
      loadPersistence()
    }
  }, [vIfPersistence, updateState, hydrated, $atomKey])

  useEffect(() => {
    async function getPromiseInitialValue() {
      // Only resolve promise if default or resolved value are not present
      if (!_isDefined(defaultAtomsValues[$atomKey])) {
        if (_isFunction(init.default)) {
          if (pendingAtoms[$atomKey] === 0) {
            pendingAtoms[$atomKey] += 1
            let v = _isDefined(init.default)
              ? (async () =>
                  _isFunction(init.default)
                    ? (init.default as () => Promise<R>)()
                    : init.default)()
              : undefined
            if (_isDefined(v)) {
              ;(v as any).then((val: any) => {
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
                _isDefined(state) ? state : defaultAtomsValues[$atomKey]
              )
            }
          }
        }
      }
    }
    getPromiseInitialValue()
  }, [state, initDef, updateState, init.name, hookCall])

  useEffect(() => {
    return () => {
      pendingAtoms[$atomKey] = 0
    }
  }, [init.name])

  useEffect(() => {
    const handler = async (e: any) => {
      if (e.hookCall !== hookCall) {
        if (_isDefined(e.payload)) {
          setState(e.payload)
        }
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
        const storageItem = await $localStorage.getItem($atomKey)
        if (_isDefined(storageItem) || storageItem === null) {
          // Only remove from localStorage if persistence is false
          if (!persistence) {
            $localStorage.removeItem($atomKey)
          } else {
            if (_isDefined(state)) {
              if (!jsonEquality(state, init.default)) {
                $localStorage.setItem($atomKey, JSON.stringify(state))
              }
            }
          }
        }
      }
    }
    updateStorage()
  }, [init.name, persistence, state])

  const atomGet = useCallback(
    function <R>($atom: useAtomType<R> | Atom<R, any>): R {
      const $key = [prefix, ($atom as any)["atom-name"]].join("-")
      const $atomValue = defaultAtomsValues[$key]
      return $atomValue
    },
    [prefix]
  )

  const filterRead = useCallback(
    function <R>($filter: (() => R | Promise<R>) | Filter<R | Promise<R>>): R {
      const $key = [prefix, ($filter as any)["filter-name"]].join("-")
      const $filterValue = defaultFiltersValues[$key]
      return $filterValue
    },
    [prefix]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, [init.actions])
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
              get: atomGet,
              read: filterRead,
            }),
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return [
    state,
    updateState,
    __actions as Required<ActionsObjectType<ActionsArgs>>,
  ]
}

const ignoredAtomKeyWarnings: any = {}

/**
 * Creates an atom containing state
 */
export function atom<R, ActionsArgs = any>(init: Atom<R, ActionsArgs>) {
  if (init.ignoreKeyWarning) {
    ignoredAtomKeyWarnings[init.name] = true
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
  if (!_isDefined(filtersInitializeObjects[init?.name])) {
    filtersInitializeObjects[init?.name] = init
  }

  const { name = "" } = filtersInitializeObjects[init?.name]

  let filterDeps: any = {}

  let $resolving: any = {}

  let readFilters: any = {}

  let readFiltersValues: any = {}

  let depsValues: any = {}

  const useFilterGet = () => {
    const hookCall = useMemo(() => Math.random(), [])

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
      [prefix, hookCall, $filterKey]
    )

    for (let dep in filterDeps[`${prefix}-`]) {
      if (depsValues[dep] !== defaultAtomsValues[dep]) {
        resolvedFilters[$filterKey] = false
      }
    }

    for (let dep in readFilters) {
      if (readFiltersValues[dep] !== defaultFiltersValues[dep]) {
        resolvedFilters[$filterKey] = false
      }
    }

    const getObject = useMemo(
      () => ({
        get: ($atom: any) => {
          subscribedFilters[$filterKey] = true
          if (!_isFunction($atom)) {
            const depsKey = [prefix, $atom.name].join("-")
            filterDeps[`${prefix}-`][depsKey] = true
            depsValues[depsKey] = defaultAtomsValues[depsKey]
          } else {
            const depsKey = [prefix, $atom?.["init-object"]?.name].join("-")
            filterDeps[`${prefix}-`][depsKey] = true
            depsValues[depsKey] = defaultAtomsValues[depsKey]
          }

          const __valuesKey = [prefix, atom.name].join("-")
          const __valuesKeyNames = [prefix, $atom["atom-name"]].join("-")

          return !_isFunction($atom)
            ? !_isDefined(defaultAtomsValues[__valuesKey])
              ? $atom.default
              : defaultAtomsValues[__valuesKey]
            : !_isDefined(defaultAtomsValues[__valuesKeyNames])
            ? $atom["init-object"].default
            : defaultAtomsValues[__valuesKeyNames]
        },
        read: ($filter: any) => {
          subscribedFilters[$filterKey] = true
          const __filtersKey = !_isFunction($filter)
            ? [prefix, $filter.name].join("-")
            : [prefix, $filter["filter-name"]].join("-")

          if (!_isFunction($filter)) {
            readFilters[__filtersKey] = true
            readFiltersValues[__filtersKey] = defaultFiltersValues[__filtersKey]
          } else {
            // We want any re-renders from filters used to trigger a re-render of the current filter
            readFilters[__filtersKey] = true
            readFiltersValues[__filtersKey] = defaultFiltersValues[__filtersKey]
          }

          return !_isFunction($filter)
            ? !_isDefined(defaultFiltersValues[__filtersKey])
              ? $filter.default
              : defaultFiltersValues[__filtersKey]
            : !_isDefined(defaultFiltersValues[__filtersKey])
            ? $filter["init-object"]?.default
            : defaultFiltersValues[__filtersKey]
        },
      }),
      [prefix]
    )

    function getInitialValue(): any {
      try {
        let firstResolved = undefined
        return !resolvedFilters[$filterKey]
          ? (() => {
              resolvedFilters[$filterKey] = true
              defaultFiltersValues[$filterKey] = init.default
              try {
                firstResolved = filtersInitializeObjects[name]?.get(getObject)
                if (!_isDefined(firstResolved)) {
                  return init.default
                } else {
                  ;(async () => {
                    firstResolved = await firstResolved
                    defaultFiltersValues[$filterKey] = firstResolved
                    // This hook will notify itself if any deps have changed
                    if (_isDefined(firstResolved)) {
                      notifyOtherFilters("", firstResolved)
                    }
                  })()
                  return firstResolved
                }
              } catch (err) {
              } finally {
                if (_isDefined(firstResolved)) {
                  notifyOtherFilters("", firstResolved)
                }
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

    let defValue: any = defaultFiltersValues[$filterKey]
    const initialValue = getInitialValue()
    resolvedFilters[$filterKey] = true

    if (_isPromise(initialValue)) {
      defaultFiltersValues[$filterKey] = initialValue
      setTimeout(async () => {
        defaultFiltersValues[$filterKey] = await initialValue
        notifyOtherFilters(hookCall, await defaultFiltersValues[$filterKey])
      }, 0)
    }

    if (_isDefined(initialValue)) {
      if (_isPromise(initialValue)) {
        initialValue.then((e: any) => {
          defValue = e
          defaultFiltersValues[$filterKey] = e
          filterObserver.notify($filterKey, "", e)
        })
      } else {
        defValue = initialValue
        defaultFiltersValues[$filterKey] = initialValue
      }
    } else {
      if (!_isDefined(defValue)) {
        defValue = init.default
      }
    }

    const [filterValue, setFilterValue] = useState<R>(() =>
      _isDefined(defValue)
        ? _isPromise(defValue)
          ? _isPromise(initialValue)
            ? init.default
            : initialValue
          : defValue
        : (() => {
            return defValue
          })()
    )

    useEffect(() => {
      atomObservables[$filterKey]?.notify($filterKey, "", filterValue as any)
    }, [filterValue])

    useEffect(() => {
      if (!resolvedFilters[$filterKey]) {
        if (_isDefined(filterValue)) {
          notifyOtherFilters(hookCall, filterValue)
        }
      }
    }, [filterValue, hookCall, $filterKey, resolvedFilters[$filterKey]])

    useEffect(() => {
      // Render the first time if initialValue is a promise
      if (_isPromise(initialValue)) {
        initialValue.then((initial: any) => {
          if (_isDefined(initial)) {
            defaultFiltersValues[$filterKey] = initial
            setFilterValue(initial)
          }
        })
      }
    }, [initialValue])

    async function renderValue(e: any) {
      const isFilterUpdate = e.storeName in readFilters

      if (
        _isFunction(e.payload)
          ? true
          : isFilterUpdate
          ? !jsonEquality(
              defaultFiltersValues[e.storeName],
              readFiltersValues[e.storeName]
            )
          : !jsonEquality(e.payload, depsValues[e.storeName])
      ) {
        if (
          e.storeName in
          (isFilterUpdate ? readFilters : filterDeps[`${prefix}-`])
        ) {
          if (_isDefined(e.payload)) {
            if (isFilterUpdate) {
              readFiltersValues[e.storeName] = e.payload
            } else {
              depsValues[e.storeName] = e.payload
            }
          }
        }

        try {
          if (!$resolving[$filterKey]) {
            $resolving[$filterKey] = true
            const newValue =
              e.storeName in filterDeps[`${prefix}-`] ||
              e.storeName in readFilters
                ? filtersInitializeObjects[name]?.get(getObject)
                : defaultFiltersValues[$filterKey]

            defaultFiltersValues[$filterKey] = newValue
            ;(async () => {
              if (_isFunction(newValue)) {
                notifyOtherFilters(hookCall, newValue)
                setFilterValue(() => newValue)
              } else {
                if (_isDefined(newValue)) {
                  if (_isPromise(newValue)) {
                    const newV = await newValue
                    setFilterValue(newV)
                    notifyOtherFilters(hookCall, newV)
                  } else {
                    setFilterValue(newValue)
                    notifyOtherFilters(hookCall, newValue)
                  }
                }
              }
              $resolving[$filterKey] = false
            })()
          }
        } catch (err) {}
      }
    }

    useEffect(() => {
      // Whenever the filter object / function changes, add atoms deps again

      for (let dep in filterDeps[`${prefix}-`]) {
        atomObservables[dep]?.observer.addListener(dep, renderValue)
      }

      // We subscribe to any re-renders of filters that our current filter is using
      for (let readFilter in readFilters) {
        filterObservables[readFilter]?.observer.addListener(
          readFilter,
          renderValue
        )
      }

      return () => {
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
    }, [])

    async function updateValueFromObservableChange(e: any) {
      const { payload } = e
      if (hookCall !== e.hookCall) {
        const $payload = await payload
        if (_isFunction($payload)) {
          setFilterValue(() => $payload)
        } else {
          if (_isDefined($payload)) {
            setFilterValue($payload)
          }
        }
      }
    }

    useEffect(() => {
      filterObserver.observer?.addListener(
        $filterKey,
        updateValueFromObservableChange
      )
      return () => {
        filterObserver?.observer?.removeListener(
          $filterKey,
          updateValueFromObservableChange
        )
      }
    }, [$filterKey])

    return filterValue
  }
  useFilterGet["filter-name"] = name
  useFilterGet["init-object"] = init
  return useFilterGet as unknown as Filter<R>
}

export function useFilter<T>(
  f: (() => T | Promise<T>) | Filter<T | Promise<T>>
) {
  const { prefix } = useContext(atomicStateContext)

  if (_isFunction(f)) {
    const $f = (f as any)["init-object"]
    if ($f !== filtersInitializeObjects[$f?.name]) {
      if (_isDefined($f)) {
        ;(filtersInitializeObjects[$f?.name] || {}).get = $f?.get
      }
    }
  } else {
    if (filtersInitializeObjects[f.name] !== f) {
      ;(filtersInitializeObjects[f?.name] || {}).get = (f as any)?.get
    }
  }

  return (
    !_isFunction(f)
      ? (() => {
          const __filterSKey = [prefix, f.name].join("-")
          if (!_isDefined(objectFilters[__filterSKey])) {
            objectFilters[__filterSKey] = filter(
              filtersInitializeObjects[f.name] as any
            )
          } else {
            if (objectFilters[__filterSKey]["init-object"] !== f) {
              objectFilters[__filterSKey] = filter(f as any)
            }
          }
          return objectFilters[__filterSKey]()
        })()
      : (f as any)()
  ) as T
}

const objectAtoms: any = {}

/**
 * Get an atom's value and state setter
 */
export function useAtom<R, ActionsArgs = any>(atom: Atom<R, ActionsArgs>) {
  if (!_isFunction(atom)) {
    if (!_isDefined(objectAtoms[atom.name])) {
      objectAtoms[atom.name] = createAtom(atom)
    } else {
      if (objectAtoms[atom.name]["init-object"] !== atom) {
        objectAtoms[atom.name] = createAtom(atom)
      }
    }
  }

  return (
    !_isFunction(atom) ? objectAtoms[atom.name]() : (atom as () => void)()
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
  return useAtom(atom)[2] as Required<ActionsObjectType<ActionsArgs>>
}
export const useAtomActions = useActions

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
            if (_isDefined(localStorage[k])) {
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
      if (_isFunction(localStorage.setItem)) {
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
      if (_isFunction(localStorage.removeItem)) {
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
      if (_isFunction(localStorage.getItem)) {
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
      if (!jsonEquality(localStorage[k], def)) {
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
