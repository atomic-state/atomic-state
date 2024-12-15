'use client'
/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  StrictMode
} from 'react'

type Observable = {
  addListener(event: string, listener?: any): void
  removeListener(event: string, listener?: any): void
  emit(event: string, payload?: any): void
}

import {
  defaultAtomsValues,
  atomsInitializeObjects,
  filtersInitializeObjects,
  defaultAtomsInAtomic,
  usedKeys,
  defaultFiltersValues,
  atomsEffectsCleanupFunctons,
  pendingAtoms,
  getAtom,
  getValue
} from './store'
import { _isDefined, _isFunction, _isPromise, jsonEquality } from './utils'

export type ActionType<Args, T = any, Return = any> = T extends undefined
  ? (
      args: {
        args?: Args
        state: T
        dispatch: Dispatch<SetStateAction<T>>
      } & ActionGet
    ) => Return
  : (
      args: {
        args: Args
        state: T
        dispatch: Dispatch<SetStateAction<T>>
      } & ActionGet
    ) => Return

/**
 * Atom type
 */
export type Atom<T = any, ActionArgs = any> = {
  /**
   * @deprecated Use `key` instead
   */
  name?: string
  key: string
  default?: T | Promise<T> | (() => Promise<T>) | (() => T)

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
export type SelectorGet = {
  get<R>(atom: useAtomType<R> | Atom<R, any>): R
}
/**
 * Type for the `get` function of filters
 */
export type ActionGet = {
  get<R>(atom: useAtomType<R> | Atom<R, any>, storeName?: string | boolean): R
}

/**
 * Filter type
 */
export type Selector<T = any> = {
  /**
   * @deprecated Use `key` instead
   */
  name?: string
  key: string
  default?: T
  get(c: SelectorGet): T | Promise<T>
}

function newObservable(): Observable {
  let subscribers: any = {}

  const observer: Observable = {
    addListener(event: string, listener?: any) {
      if (!subscribers[event]) {
        subscribers[event] = []
      }
      subscribers[event].push(listener)
    },
    removeListener(event: string, listener?: any) {
      if (!subscribers[event]) {
        subscribers[event] = []
      }
      subscribers[event] = subscribers[event].filter((l: any) => l !== listener)
    },
    emit(event: string, payload?: any) {
      if (subscribers[event]) {
        subscribers[event].forEach((listener: any) => {
          listener(payload)
        })
      }
    }
  }

  return observer
}

export function createObserver() {
  const observer = newObservable()

  function notify(storeName: string, hookCall: string, payload: any) {
    observer.emit(storeName, { storeName, hookCall, payload })
  }
  return {
    observer: observer,
    notify
  }
}

const atomObservables: {
  [key: string]: {
    observer: Observable
    notify: (storeName: string, hookCall: string, payload?: any) => void
  }
} = {}

type PersistenceGet = (key: string) => any
type PersistenceSet = (key: string, value: any) => void
type PersistenceRemove = (key: string) => void

export type PersistenceStoreType = {
  // Get item
  get?: PersistenceGet
  getItem?: PersistenceGet
  getItemAsync?: PersistenceGet

  // Set item
  set?: PersistenceSet
  setItem?: PersistenceSet
  setItemAsync?: PersistenceSet

  // Remove item
  remove?: PersistenceRemove
  removeItem?: PersistenceRemove
  removeItemAsync?: PersistenceRemove
  delete?: PersistenceRemove
  deleteItem?: PersistenceRemove
  deleteItemAsync?: PersistenceRemove
}

const defaultPersistenceProvider =
  typeof localStorage !== 'undefined'
    ? localStorage
    : {
        getItem() {},
        setItem() {},
        removeItem() {}
      }

export function createPersistence(
  persistenceProvider: PersistenceStoreType = defaultPersistenceProvider
) {
  const setItem =
    persistenceProvider.setItem ??
    persistenceProvider.set ??
    persistenceProvider.setItemAsync ??
    (() => {})

  const getItem =
    persistenceProvider.getItem ??
    persistenceProvider.get ??
    persistenceProvider.getItemAsync ??
    (() => {})

  const removeItem =
    persistenceProvider.removeItem ??
    persistenceProvider.remove ??
    persistenceProvider.removeItemAsync ??
    persistenceProvider.delete ??
    persistenceProvider.deleteItem ??
    persistenceProvider.deleteItemAsync ??
    (() => {})

  persistenceProvider.setItem = setItem
  persistenceProvider.getItem = getItem
  persistenceProvider.removeItem = removeItem

  return persistenceProvider
}

const atomicStateContext = createContext<{
  storeName: string | boolean
  persistenceProvider: PersistenceStoreType
}>({
  storeName: false,
  persistenceProvider: defaultPersistenceProvider
})

function AtomInitialize({ atm }: any) {
  useAtom(atm)
  return null
}

export const AtomicState: React.FC<{
  clientOnly?: boolean
  children: any
  /**
   * Set default values using an atom's key
   */
  default?: {
    [key: string]: any
  }
  value?: {
    [key: string]: any
  }
  /**
   * The store name where atoms under the tree will be saved
   */
  storeName?: string | boolean
  /**
   * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
   *
   * @default localStorage
   */
  persistenceProvider?: PersistenceStoreType
}> = ({
  children,
  default: def,
  value,
  storeName = false,
  clientOnly,
  persistenceProvider = defaultPersistenceProvider
}) => {
  if (def) {
    for (let atomKey in def) {
      /**
       *
       * When promises are passed in nextjs, they are sent as chunks, so here
       * we try to parse their values
       */

      let parsedChunk

      const dataChunk = def[atomKey] ?? def[atomKey]

      if (dataChunk instanceof Promise) {
        try {
          const parsedChunkValue = JSON.parse((dataChunk as any).value)
          parsedChunk = parsedChunkValue?.data ?? parsedChunkValue
        } catch {
          parsedChunk = dataChunk
        }
      } else {
        parsedChunk = dataChunk
      }

      const defaultsKey =
        storeName === false ? atomKey : `${storeName}-${atomKey}`

      defaultAtomsValues.set(defaultsKey, parsedChunk)
      defaultAtomsInAtomic.set(defaultsKey, true)
    }
  }
  if (value) {
    for (let atomKey in value) {
      /**
       *
       * When promises are passed in nextjs, they are sent as chunks, so here
       * we try to parse their values
       */

      let parsedChunk

      const dataChunk = value[atomKey] ?? value[atomKey]

      if (dataChunk instanceof Promise) {
        try {
          const parsedChunkValue = JSON.parse((dataChunk as any).value)
          parsedChunk = parsedChunkValue?.data ?? parsedChunkValue
        } catch {
          parsedChunk = dataChunk
        }
      } else {
        parsedChunk = dataChunk
      }

      const defaultsKey =
        storeName === false ? atomKey : `${storeName}-${atomKey}`

      defaultAtomsValues.set(defaultsKey, parsedChunk)
      defaultAtomsInAtomic.set(defaultsKey, true)
    }
  }

  const createdAtoms = Object.values(atomsInitializeObjects) as any

  const thisId = useMemo(() => Math.random(), []).toString()

  const initialized = useMemo(
    () =>
      createdAtoms.map((atm: any) => {
        return (
          <StrictMode key={atm?.name + storeName + thisId}>
            <AtomInitialize atm={atm} />
          </StrictMode>
        )
      }),
    [createdAtoms]
  )

  return (
    <atomicStateContext.Provider
      value={{
        storeName: storeName === '' ? false : storeName,
        persistenceProvider
      }}
    >
      <>{initialized}</>

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
export function takeSnapshot(storeName: string = 'default') {
  let stores: any = {}

  for (let atomKey of defaultAtomsValues.keys()) {
    const [prefixName, atomName] = atomKey.split('-')

    const storeExists = atomKey.includes('-')

    // This means an atom does not belong to a specific store
    // so it will be added to the `default` store
    if (!atomName) {
      if (!stores.default) {
        stores.default = {}
      }
    } else {
      if (!_isDefined(stores[prefixName])) {
        stores[prefixName] = {}
      }
    }

    if (storeExists) {
      stores[prefixName][atomName] = defaultAtomsValues.get(atomKey)
    } else {
      stores['default'][prefixName] = defaultAtomsValues.get(atomKey)
    }
  }

  for (let filterKey of defaultFiltersValues.keys()) {
    const [prefixName, filterName] = filterKey.split('-')

    const storeExists = filterKey.includes('-')

    if (!storeExists) {
      if (!stores.default) {
        stores.default = {}
      }
    } else {
      if (!_isDefined(stores[prefixName])) {
        stores[prefixName] = {}
      }
    }
    if (storeExists) {
      stores[prefixName][filterName] = defaultFiltersValues.get(filterKey)
    } else {
      stores['default'][prefixName] = defaultFiltersValues.get(filterKey)
    }
  }
  return !_isDefined(storeName) ? stores : stores[storeName as any] || {}
}

export function setAtom<R = any>(
  $atom: Atom<R>,
  v: SetStateAction<R>,
  prefix?: string
) {
  const init = ($atom as any)['init-object']

  const { key, effects = [] } = init as Atom<R>

  const $atomKey = (prefix ? `${prefix}-${key}` : key) as string

  const observable = atomObservables[$atomKey!]

  const newValue =
    typeof v === 'function' ? (v as any)(defaultAtomsValues.get($atomKey)) : v

  let willCancel: boolean = false

  function cancel() {
    willCancel = true
  }

  for (let cleanupFunction of atomsEffectsCleanupFunctons.get($atomKey) ?? []) {
    cleanupFunction()
  }

  for (let effect of effects) {
    const currentState = defaultAtomsValues.get($atomKey)

    const effectResult = effect({
      previous: currentState,
      state: newValue,
      cancel,
      dispatch: undefined!
    })

    if (typeof effectResult === 'boolean') {
      if (effectResult === false) {
        willCancel = true
      }
    }
  }

  if (!willCancel) {
    defaultAtomsValues.set($atomKey, newValue)
    if (observable) {
      observable.notify(
        $atomKey,
        Math.random().toFixed(2),
        defaultAtomsValues.get($atomKey)
      )
    }
  }
}

export function getActions<R = any, A = any>($atom: Atom<R, A>) {
  const init = ($atom as any)['init-object'] as Atom<R, A>

  let _actions: any = {}

  for (let action in init.actions) {
    _actions[action] = (args: (typeof init.actions)[typeof action]) =>
      (init.actions as any)[action]({
        state: defaultAtomsValues.get(init.key),
        args,
        dispatch: (v: any) => setAtom($atom, v),
        get: getAtom,
        set: setAtom
      })
  }

  return _actions as Required<ActionsObjectType<A>>
}

function useAtomCreate<R, ActionsArgs>(init: Atom<R, ActionsArgs>) {
  const { storeName, persistenceProvider } = useContext(atomicStateContext)

  const {
    effects = [],
    persist,
    sync = true,
    onSync = () => {},
    persistenceProvider: $localStorage = persistenceProvider
  } = init

  const persistence = persist

  const $persistence = createPersistence($localStorage) as Storage

  if (!init.name) {
    init.name = init.key as string
  }

  const $atomKey = storeName === false ? init.name : storeName + '-' + init.name

  const [isLSReady, setIsLSReady] = useState(false)

  const hookCall = useMemo(() => `${Math.random()}`.split('.')[1], [])

  if (!atomsEffectsCleanupFunctons.has($atomKey)) {
    atomsEffectsCleanupFunctons.set($atomKey, [])
  }

  const isDefined = _isDefined(init.default)

  const initDef = _isDefined(defaultAtomsValues.get($atomKey))
    ? defaultAtomsValues.get($atomKey)
    : init.default

  const initialValue = (function getInitialValue() {
    const isFunction =
      !_isDefined(defaultAtomsValues.get($atomKey)) && _isFunction(init.default)

    const initialIfFnOrPromise = isFunction
      ? (init.default as any)()
      : _isPromise(init.default)
      ? init.default
      : undefined

    const isPromiseValue = _isPromise(initialIfFnOrPromise)

    let initVal = isDefined
      ? !_isDefined(defaultAtomsValues.get($atomKey))
        ? !isPromiseValue
          ? _isDefined(initialIfFnOrPromise)
            ? initialIfFnOrPromise
            : initDef
          : init.default
        : initDef
      : initDef

    try {
      if (persistence) {
        if (typeof localStorage !== 'undefined') {
          if (
            !_isDefined(defaultAtomsValues.get($atomKey)) ||
            defaultAtomsInAtomic.get($atomKey)
          ) {
            defaultAtomsInAtomic.set($atomKey, false)
            defaultAtomsValues.set(
              $atomKey,
              isPromiseValue ? undefined : initVal
            )
          }
        }
      } else {
        if (!_isDefined(defaultAtomsValues.get($atomKey))) {
          defaultAtomsValues.set($atomKey, initVal)
        }
      }
      return initVal
    } catch (err) {
      return initVal
    }
  })()

  const [vIfPersistence, setVIfPersistence] = useState(() => {
    if (persist) {
      if (typeof window !== 'undefined') {
        try {
          return (async () => {
            try {
              const storageItem =
                typeof $persistence === 'undefined'
                  ? init.default
                  : await $persistence.getItem($atomKey)
              return typeof $persistence === 'undefined'
                ? init.default
                : JSON.parse(storageItem as any) || initDef
            } catch {
              return undefined
            }
          })()
        } catch (err) {
          return initialValue
        }
      }
    } else return undefined
  })

  const [state, setState] = useState<R>(
    (_isPromise(initialValue) || _isFunction(initialValue)) &&
      !_isDefined(defaultAtomsValues.get($atomKey))
      ? undefined
      : (() => {
          defaultAtomsValues.set($atomKey, initialValue)
          return initialValue
        })()
  )

  if (!pendingAtoms.get($atomKey)) {
    pendingAtoms.set($atomKey, 0)
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
      newValue = _isFunction(v)
        ? (v as any)(defaultAtomsValues.get($atomKey))
        : v
      hasChanded = (() => {
        try {
          return !jsonEquality(newValue, defaultAtomsValues.get($atomKey))
        } catch (err) {
          return false
        }
      })()

      const notifyIfValueIsDefault = (() => {
        try {
          if (_isFunction(defaultAtomsValues.get($atomKey))) {
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
        _isFunction(defaultAtomsValues.get($atomKey)) ||
        hasChanded ||
        notifyIfValueIsDefault

      // We first run every cleanup functions returned in atom effects
      try {
        for (let cleanupFunction of atomsEffectsCleanupFunctons.get($atomKey)) {
          cleanupFunction()
        }
      } catch (err) {
      } finally {
        // We reset all atom cleanup functions
        atomsEffectsCleanupFunctons.set($atomKey, [])
        try {
          for (let effect of effects) {
            const cancelStateUpdate = effect({
              previous: state,
              state: newValue,
              dispatch: updateState,
              cancel: cancelUpdate
            }) as unknown as boolean | Promise<any>

            if (_isPromise(cancelStateUpdate)) {
              ;(cancelStateUpdate as any).then((r: any) => {
                if (_isDefined(r) && !r) {
                  willCancel = true
                } else {
                  if (_isFunction(r)) {
                    atomsEffectsCleanupFunctons.get($atomKey).push(r)
                  }
                }
              })
            } else if (_isDefined(cancelStateUpdate) && !cancelStateUpdate) {
              willCancel = true
            } else {
              if (_isFunction(cancelStateUpdate)) {
                atomsEffectsCleanupFunctons
                  .get($atomKey)
                  .push(cancelStateUpdate)
              }
            }
          }
        } catch (err) {
          setRunEffects(true)
        } finally {
          if (!willCancel) {
            if (_isDefined(newValue)) {
              defaultAtomsValues.set($atomKey, newValue)
              if (persistence) {
                $persistence.setItem($atomKey, JSON.stringify(newValue))
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
      init.name
    ]
  ) as Dispatch<SetStateAction<R>>

  useEffect(() => {
    async function storageListener() {
      if (typeof localStorage !== 'undefined') {
        if (_isDefined(localStorage[$atomKey])) {
          try {
            const newState = JSON.parse(localStorage[$atomKey])
            /**
             * We compare our atom saved in the storage with the current
             * atom value and only update our state if they are different
             *
             **/
            if (!jsonEquality(newState, defaultAtomsValues.get($atomKey))) {
              updateState(newState)
              await onSync(newState)
            }
          } catch (err) {}
        }
      }
    }
    if (persistence) {
      if (typeof window !== 'undefined') {
        if (typeof localStorage !== 'undefined') {
          if ($persistence === localStorage) {
            const canListen = _isDefined(window.addEventListener)
            if (canListen) {
              if (sync) {
                window.addEventListener('storage', storageListener)
                return () => {
                  window.removeEventListener('storage', storageListener)
                }
              }
            }
          }
        }
      }
    }
    return () => {}
  }, [init.name, persistence, $persistence])

  useEffect(() => {
    async function loadPersistence() {
      persistenceLoaded[$atomKey] = true
      if (_isDefined(vIfPersistence)) {
        if (!hydrated.current) {
          const tm1 = setTimeout(async () => {
            if (persistence) {
              const storageItem = await vIfPersistence
              if (
                !jsonEquality(storageItem, defaultAtomsValues.get($atomKey))
              ) {
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
      if (!_isDefined(defaultAtomsValues.get($atomKey))) {
        if (_isFunction(init.default)) {
          if (pendingAtoms.get($atomKey) === 0) {
            pendingAtoms.set($atomKey, pendingAtoms.get($atomKey) + 1)
            let v = _isDefined(init.default)
              ? (async () =>
                  _isFunction(init.default)
                    ? (init.default as () => Promise<R>)()
                    : init.default)()
              : undefined
            if (_isDefined(v)) {
              ;(v as any).then((val: any) => {
                defaultAtomsValues.set($atomKey, val)
                notify($atomKey, hookCall, defaultAtomsValues.get($atomKey))
                updateState(val as R)
              })
            }
          } else {
            pendingAtoms.set($atomKey, pendingAtoms.get($atomKey) + 1)
            if (state || defaultAtomsValues.get($atomKey)) {
              atomObservables[$atomKey]?.notify(
                $atomKey,
                hookCall,
                _isDefined(state) ? state : defaultAtomsValues.get($atomKey)
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
      pendingAtoms.set($atomKey, 0)
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
      if (typeof localStorage !== 'undefined') {
        const storageItem = await $persistence.getItem($atomKey)
        if (_isDefined(storageItem) || storageItem === null) {
          // Only remove from localStorage if persistence is false
          if (!persistence) {
            $persistence.removeItem($atomKey)
          } else {
            if (_isDefined(state)) {
              $persistence.setItem($atomKey, JSON.stringify(state))
            }
          }
        }
      }
    }
    updateStorage()
  }, [init.name, persistence, state])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => init.actions || {}, [init.actions])
  const __actions = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map(key => [
          key,
          (args?: any) =>
            (actions as any)[key]({
              args,
              state,
              dispatch: updateState as Dispatch<SetStateAction<R>>,
              get: getValue
            })
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )

  return [
    state,
    updateState,
    __actions as Required<ActionsObjectType<ActionsArgs>>
  ]
}

/**
 * Creates an atom containing state
 */
export function atom<R, ActionsArgs = any>(
  $init: Omit<Atom<R, ActionsArgs>, 'name'> | Omit<Selector<R>, 'name'>
) {
  if ('get' in $init) {
    return filter($init as Selector<R>)
  } else {
    const init = $init as Atom<R, ActionsArgs>
    if (!init.name) {
      init.name = init.key as string
    }

    usedKeys.set(init.name, true)

    if (!atomsInitializeObjects.get(init.name)) {
      atomsInitializeObjects.set(init?.name, init)
    }

    const useCreate = () => useAtomCreate<R, ActionsArgs>(init)
    useCreate['atom-name'] = init.name
    useCreate['init-object'] = init

    useCreate.key = init.name

    return useCreate as Atom<R, ActionsArgs>
  }
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

export function filter<R>(init: Selector<R | Promise<R>>) {
  if (!init.name) {
    init.name = init.key as string
  }

  if (!_isDefined(filtersInitializeObjects.get(init?.name))) {
    filtersInitializeObjects.set(init?.name, init)
  }

  const { name = '' } = filtersInitializeObjects.get(init?.name)

  let filterDeps: any = {}

  let $resolving: any = {}

  let readFilters: any = {}

  let readFiltersValues: any = {}

  let depsValues: any = {}

  const useFilterGet = () => {
    const hookCall = useMemo(() => Math.random(), [])

    const { storeName } = useContext(atomicStateContext)

    const $prefix = storeName === false ? '' : (storeName as string)

    if (!filterDeps[$prefix]) {
      filterDeps[$prefix] = {}
    }

    const $filterKey = storeName === false ? name : storeName + '-' + name

    if (!filterObservables[$filterKey]) {
      filterObservables[$filterKey] = createObserver()
    }

    const filterObserver = filterObservables[$filterKey]

    const notifyOtherFilters = useCallback(
      function notifyOtherFilters(hookCall: any, payload: any) {
        filterObserver.notify($filterKey, hookCall, payload)
      },
      [storeName, hookCall, $filterKey]
    )

    for (let dep in filterDeps[$prefix]) {
      if (depsValues[dep] !== defaultAtomsValues.get(dep)) {
        resolvedFilters[$filterKey] = false
      }
    }

    for (let dep in readFilters) {
      if (readFiltersValues[dep] !== defaultFiltersValues.get(dep)) {
        resolvedFilters[$filterKey] = false
      }
    }

    const $$filterGet = ($atom: any) => {
      subscribedFilters[$filterKey] = true

      if (!_isFunction($atom)) {
        const depsKey =
          storeName === false ? $atom.name : [storeName, $atom.name].join('-')
        filterDeps[$prefix][depsKey] = true
        depsValues[depsKey] = defaultAtomsValues.get(depsKey)
      } else {
        const depsKey =
          storeName === false
            ? $atom?.['init-object']?.name
            : [storeName, $atom?.['init-object']?.name].join('-')
        filterDeps[$prefix][depsKey] = true
        depsValues[depsKey] = defaultAtomsValues.get(depsKey)
      }

      const __valuesKey =
        storeName === false ? atom.name : [storeName, atom.name].join('-')
      const __valuesKeyNames =
        storeName === false
          ? $atom['atom-name']
          : [storeName, $atom['atom-name']].join('-')

      return !_isFunction($atom)
        ? !_isDefined(defaultAtomsValues.get(__valuesKey))
          ? $atom.default
          : defaultAtomsValues.get(__valuesKey)
        : !_isDefined(defaultAtomsValues.get(__valuesKeyNames))
        ? $atom['init-object'].default
        : defaultAtomsValues.get(__valuesKeyNames)
    }

    const $$filterRead = ($filter: any) => {
      subscribedFilters[$filterKey] = true
      const __filtersKey = !_isFunction($filter)
        ? storeName === false
          ? $filter.name
          : [storeName, $filter.name].join('-')
        : storeName === false
        ? $filter['filter-name']
        : [storeName, $filter['filter-name']].join('-')

      if (!_isFunction($filter)) {
        readFilters[__filtersKey] = true
        readFiltersValues[__filtersKey] = defaultFiltersValues.get(__filtersKey)
      } else {
        // We want any re-renders from filters used to trigger a re-render of the current filter
        readFilters[__filtersKey] = true
        readFiltersValues[__filtersKey] = defaultFiltersValues.get(__filtersKey)
      }

      return !_isFunction($filter)
        ? !_isDefined(defaultFiltersValues.get(__filtersKey))
          ? $filter.default
          : defaultFiltersValues.get(__filtersKey)
        : !_isDefined(defaultFiltersValues.get(__filtersKey))
        ? $filter['init-object']?.default
        : defaultFiltersValues.get(__filtersKey)
    }

    const getObject = useMemo(
      () => ({
        get: ($atom: any) => {
          const isFilter = typeof $atom?.['init-object'].get === 'function'
          return isFilter ? $$filterRead($atom) : $$filterGet($atom)
        },
        read: ($filter: any) => {
          return $$filterRead($filter)
        }
      }),
      [storeName]
    )

    function getInitialValue(): any {
      try {
        let firstResolved = undefined
        return !resolvedFilters[$filterKey]
          ? (() => {
              resolvedFilters[$filterKey] = true
              defaultFiltersValues.set($filterKey, init.default)
              try {
                firstResolved = filtersInitializeObjects
                  .get(name)
                  ?.get(getObject)
                if (!_isDefined(firstResolved)) {
                  return init.default
                } else {
                  ;(async () => {
                    firstResolved = await firstResolved
                    defaultFiltersValues.set($filterKey, firstResolved)
                    // This hook will notify itself if any deps have changed
                    if (_isDefined(firstResolved)) {
                      notifyOtherFilters('', firstResolved)
                    }
                  })()
                  return firstResolved
                }
              } catch (err) {
              } finally {
                if (_isDefined(firstResolved)) {
                  notifyOtherFilters('', firstResolved)
                }
                return firstResolved
              }
            })()
          : (() => {
              return defaultFiltersValues.get($filterKey)
            })()
      } catch (err) {
        return init.default
      }
    }

    let defValue: any = defaultFiltersValues.get($filterKey)
    const initialValue = getInitialValue()
    resolvedFilters[$filterKey] = true

    if (_isPromise(initialValue)) {
      defaultFiltersValues.set($filterKey, initialValue)
      setTimeout(async () => {
        defaultFiltersValues.set($filterKey, await initialValue)
        notifyOtherFilters(hookCall, await defaultFiltersValues.get($filterKey))
      }, 0)
    }

    if (_isDefined(initialValue)) {
      if (_isPromise(initialValue)) {
        initialValue.then((e: any) => {
          defValue = e
          defaultFiltersValues.set($filterKey, e)
          filterObserver.notify($filterKey, '', e)
        })
      } else {
        defValue = initialValue
        defaultFiltersValues.set($filterKey, initialValue)
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
      atomObservables[$filterKey]?.notify($filterKey, '', filterValue as any)
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
            defaultFiltersValues.set($filterKey, initial)
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
              defaultFiltersValues.get(e.storeName),
              readFiltersValues[e.storeName]
            )
          : !jsonEquality(e.payload, depsValues[e.storeName])
      ) {
        if (
          e.storeName in (isFilterUpdate ? readFilters : filterDeps[$prefix])
        ) {
          if (_isDefined(e.payload)) {
            if (isFilterUpdate) {
              readFiltersValues[e.storeName] = e.payload
            } else {
              depsValues[e.storeName] = e.payload
            }
          }
        }

        if (!$resolving[$filterKey]) {
          $resolving[$filterKey] = true
          try {
            const newValue =
              e.storeName in filterDeps[$prefix] || e.storeName in readFilters
                ? filtersInitializeObjects.get(name)?.get(getObject)
                : defaultFiltersValues.get($filterKey)

            defaultFiltersValues.set($filterKey, newValue)
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
            })()
          } catch (err) {
          } finally {
            queueMicrotask(() => {
              $resolving[$filterKey] = false
            })
          }
        }
      }
    }

    useEffect(() => {
      // Whenever the filter object / function changes, add atoms deps again

      for (let dep in filterDeps[$prefix]) {
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
        for (let dep in filterDeps[$prefix]) {
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
  useFilterGet['filter-name'] = name
  useFilterGet['init-object'] = init
  return useFilterGet as unknown as Selector<R>
}

export const selector = filter

export function useFilter<T>(
  f: (() => T | Promise<T>) | Selector<T | Promise<T>>
) {
  const { storeName } = useContext(atomicStateContext)

  if (_isFunction(f)) {
    const $f = (f as any)['init-object']
    if ($f !== filtersInitializeObjects.get($f?.name)) {
      if (_isDefined($f)) {
        ;(filtersInitializeObjects.get($f?.name) || {}).get = $f?.get
      }
    }
  } else {
    if (!f.name) {
      // @ts-ignore
      f.name = (f as any).key as string
    }
    if (filtersInitializeObjects.get(f.name) !== f) {
      ;(filtersInitializeObjects.get(f?.name) || {}).get = (f as any)?.get
    }
  }

  const renderdFilter = !_isFunction(f)
    ? (() => {
        if (!f.name) {
          // @ts-ignore
          f.name = f.key as string
        }
        const __filterSKey =
          storeName === false ? f.name : [storeName, f.name].join('-')
        if (!_isDefined(objectFilters[__filterSKey])) {
          objectFilters[__filterSKey] = filter(
            filtersInitializeObjects.get(f.name)
          )
        } else {
          if (objectFilters[__filterSKey]['init-object'] !== f) {
            objectFilters[__filterSKey] = filter(f as any)
          }
        }

        return objectFilters[__filterSKey]()
      })()
    : (f as any)()

  // @ts-ignore
  return (renderdFilter ?? f['init-object']?.default) as T
}

const objectAtoms: any = {}

/**
 * Get an atom's value and state setter
 */
export function useAtom<R, ActionsArgs = any>(atom: Atom<R, ActionsArgs>) {
  if (!_isFunction(atom)) {
    if (!atom.name) {
      atom.name = atom.key as string
    }

    if (!_isDefined(objectAtoms[atom.name])) {
      objectAtoms[atom.name] = createAtom(atom)
    } else {
      if (objectAtoms[atom.name]['init-object'] !== atom) {
        objectAtoms[atom.name] = createAtom(atom)
      }
    }
  }

  if (!_isFunction(atom)) {
    if (!atom.name) {
      atom.name = atom.key as string
    }
  }

  return (
    !_isFunction(atom)
      ? objectAtoms[(atom.name ?? atom.key)!]()
      : (atom as unknown as () => void)()
  ) as [
    R,
    React.Dispatch<SetStateAction<R>>,
    //  (cb: ((c: R) => R) | R) => void
    ActionsObjectType<ActionsArgs>
  ]
}

/**
 * Creates a store with the `setPartialvalue`, `setValue` and `reset`  methods.
 * It returns a hook that returns an array with the value and the actions
 */
export function createAtomicHook<R, Actions = { [k: string]: any }>(
  config: Partial<Atom<R, Actions>> = {}
) {
  type StoreActionsType = {
    setPartialvalue: Partial<R> | ((v: Required<R>) => Partial<R>)
    setPartial: Partial<R> | ((v: Required<R>) => Partial<R>)
    setValue: R | ((v: Required<R>) => R)
    reset: any
  }
  const globalStoreState = atom<R, StoreActionsType & Actions>({
    ...(config as Omit<Atom<R>, 'actions'>),
    actions: {
      /**
       * Should be used only with object values
       */
      // @ts-ignore
      setPartialvalue({ dispatch, args }) {
        if (typeof args === 'function') {
          // @ts-ignore
          dispatch(prev => ({ ...prev, ...args(prev as Required<R>) }))
          // @ts-ignore
        } else dispatch(prev => ({ ...prev, ...args }))
      },
      // @ts-ignore
      setPartial({ dispatch, args }) {
        if (typeof args === 'function') {
          // @ts-ignore
          dispatch(prev => ({ ...prev, ...args(prev as Required<R>) }))
          // @ts-ignore
        } else dispatch(prev => ({ ...prev, ...args }))
      },
      // Can be used with non-object values
      // @ts-ignore
      setValue({ dispatch, args }) {
        // @ts-ignore
        dispatch(args)
      },
      /**
       * Reset the store state to the original value (Taken from `default`)
       */
      // @ts-ignore
      reset({ dispatch }) {
        dispatch(config.default as R)
      },
      ...(config.actions as Actions)
    } as any
  })

  function useGlobalStore() {
    const [value, , actions] = useAtom(globalStoreState)

    return [value, actions] as const
  }

  useGlobalStore.atom = globalStoreState

  return useGlobalStore
}

/**
 * Creates a store with the `setPartialvalue`, `setValue` and `reset`  methods.
 * It uses `createAtomicHook` under the hood but instead of returing an array, it returns an object with the store value and actions merged
 */

export function createStore<R, Actions = { [k: string]: any }>(
  config: Partial<Atom<R, Actions>> = {}
) {
  const use$tore = createAtomicHook(config)

  const use$toreValue = atom(config as Atom<R, Actions>)

  function useStore() {
    const store = (
      _isDefined((config as any)?.get) ? useValue(use$toreValue) : use$tore()
    ) as ReturnType<typeof use$tore>

    const storeValue = store?.[0]

    const storeActions = store?.[1]

    return Array.isArray(store)
      ? {
          ...storeValue,
          ...storeActions
        }
      : (store as typeof config extends Selector
          ? R
          : typeof storeValue & typeof storeActions)
  }

  useStore.atom = use$tore.atom

  return useStore
}

export function create<R, Actions = { [k: string]: any }>(
  config: Omit<Atom<R, Actions>, 'name'> | Omit<Selector<R>, 'name'>
) {
  const thisAtom = atom(config as Atom<R, Actions> | Selector<R>)

  const all = () => {
    const atomUse = useAtom<R>(thisAtom as Atom<R, Actions>)

    // Even if TS is happy, when creating a selector, destructuring
    // with [] will result in an error with non-iterable
    // types such as number and string because selectors only return the value.
    // With this check, it is guaranteed a selector's value can be accessed
    // as [value]
    return ('get' in config ? [atomUse] : atomUse) as typeof atomUse
  }

  for (let prop in thisAtom) {
    // @ts-ignore
    all[prop] = thisAtom[prop]
  }

  all.value = () => getValue(thisAtom) as R
  all.set = (value: R | ((v: R) => R)) => setAtom(thisAtom, value)
  all.actions = getActions(thisAtom)
  all.atom = thisAtom

  all.useValue = () => useValue(thisAtom) as R
  all.setValue = all.set
  all.useAtom = () => useAtom<R>(thisAtom as Atom<R, Actions>)

  return all
}

export const store = createStore
export const atomicHook = createAtomicHook

/**
 * Get an atom's value
 */
export function useValue<R>(atom: useAtomType<R> | Atom<R, any> | Selector<R>) {
  // Check if this is a filter
  if (typeof (atom as any)?.['init-object'].get !== 'undefined')
    return useFilter<R>(atom as Selector<R>)

  // @ts-ignore
  return useAtom(atom)[0] as const
}
export const useAtomValue = useValue

/**
 * Get the function that updates the atom's value
 */
export function useDispatch<R>(atom: useAtomType<R> | Atom<R, any>) {
  // @ts-ignore
  return useAtom(atom)[1] as (cb: ((c: R) => R) | R) => void
}
export const useAtomDispatch = useDispatch

/**
 * Get the actions of the atom as reducers
 */
export function useActions<R, ActionsArgs = any>(
  atom: useAtomType<R, ActionsArgs> | Atom<R, ActionsArgs>
) {
  // @ts-ignore
  return useAtom(atom)[2] as Required<ActionsObjectType<ActionsArgs>>
}

/**
 * Get an atom's value and actions
 */
export function useValueAndActions<R, ActionsArgs = any>(
  atom: useAtomType<R, ActionsArgs> | Atom<R, ActionsArgs>
) {
  // @ts-ignore
  const [value, , actions] = useAtom(atom)
  return [value, actions] as const
}

export const useAtomActions = useActions

/**
 * Create a single provider hook with atoms
 */
export function atomProvider<R>(states: {
  [e in keyof R]: Atom<R[e]>
}) {
  type K = keyof typeof states
  function useThisAtom<E extends K>(name: E) {
    const v = states[name]
    const renderedAtom = useAtom(v)

    type RenderedState = typeof renderedAtom & {
      value?: any
      dispatch?: any
      actions?: any
    }

    let RR: RenderedState = renderedAtom
    // @ts-ignore
    if (typeof v['init-object']?.get === 'function') {
      RR = [RR] as unknown as RenderedState
      RR.value = RR
    } else {
      RR.value = renderedAtom[0]
      RR.dispatch = renderedAtom[1]
      RR.actions = renderedAtom[2]
    }
    return RR as typeof renderedAtom & {
      value: (typeof RR)[0]
      dispatch: (typeof RR)[1]
      actions: (typeof RR)[2]
    }
  }

  useThisAtom.stores = states

  useThisAtom.value = function useThisAtomValue<E extends K>(name: E) {
    const v = states[name]
    return useValue(v)
  }

  useThisAtom.dispatch = function useThisAtomDispatch<E extends K>(name: E) {
    const v = states[name]
    return useDispatch(v)
  }

  useThisAtom.actions = function useThisAtomActions<E extends K>(name: E) {
    const v = states[name]
    return useActions(v)
  }

  return useThisAtom
}

export const stateProvider = atomProvider

const storageOvservable = (() => {
  const emm = newObservable()
  return emm
})()

/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
export function useStorage<K = any>(defaults?: K): K {
  const [keys, setKeys] = useState<K>((defaults || {}) as K)

  async function updateStore() {
    let $keys: any = {}

    if (typeof localStorage !== 'undefined') {
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
    storageOvservable.addListener('store-changed', updateStore)
    return () => {
      storageOvservable.removeListener('store-changed', updateStore)
    }
  }, [])
  return keys
}

/**
 * A sync wrapper around the `localStorage` API
 */

export const storage = {
  /**
   * Set an item in `localStorage`. Its value will be serialized as JSON
   */
  set<T = any>(k: string, v: T) {
    if (typeof localStorage !== 'undefined') {
      if (_isFunction(localStorage.setItem)) {
        localStorage.setItem(k, JSON.stringify(v))
        storageOvservable.emit('store-changed', v)
      }
    }
  },
  /**
   * Remove a `localStorage` item
   */
  async remove(k: string) {
    if (typeof localStorage !== 'undefined') {
      if (_isFunction(localStorage.removeItem)) {
        localStorage.removeItem(k)
        storageOvservable.emit('store-changed', {})
      }
    }
  },

  /**
   * Get an item in `localStorage`. Its value will be JSON parsed. If it does not exist or
   * is an invalid JSON format, the default value passed in the second argument will be returned
   */
  get<T = any>(k: string, def: T = null as unknown as T): T {
    if (typeof localStorage !== 'undefined') {
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
  }
}

/**
 * A sync wrapper around the `sessionStorage` API
 */
export const session = {
  /**
   * Set an item in `sessionStorage`. Its value will be serialized as JSON
   */
  set<T = any>(k: string, v: T) {
    if (typeof sessionStorage !== 'undefined') {
      if (_isFunction(sessionStorage.setItem)) {
        sessionStorage.setItem(k, JSON.stringify(v))
      }
    }
  },
  /**
   * Remove a `sessionStorage` item
   */
  async remove(k: string) {
    if (typeof sessionStorage !== 'undefined') {
      if (_isFunction(sessionStorage.removeItem)) {
        sessionStorage.removeItem(k)
      }
    }
  },

  /**
   * Get an item in `sessionStorage`. Its value will be JSON parsed. If it does not exist or
   * is an invalid JSON format, the default value passed in the second argument will be returned
   */
  get<T = any>(k: string, def: T = null as unknown as T): T {
    if (typeof sessionStorage !== 'undefined') {
      if (_isFunction(sessionStorage.getItem)) {
        try {
          return JSON.parse(sessionStorage.getItem(k) as string)
        } catch (err) {
          return def as T
        }
      } else {
        try {
          return JSON.parse(sessionStorage[k])
        } catch (err) {
          return def as T
        }
      }
    } else {
      return def as T
    }
  }
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
    if (typeof localStorage !== 'undefined') {
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
    storageOvservable.addListener('store-changed', itemObserver)
    return () => {
      storageOvservable.removeListener('store-changed', itemObserver)
    }
  }, [])

  return value
}
