/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * An observable class that uses the observer pattern
 */
class Observervable {
  constructor() {
    this.suscribers = {}
  }
  async addSubscriber(messageName, subscriber) {
    if (!(messageName in this.suscribers)) {
      this.suscribers[messageName] = {}
    }
    let subscriberId = Object.keys(this.suscribers[messageName]).length + 1
    if (messageName !== "__proto__" && messageName !== "prototype") {
      this.suscribers[messageName][subscriberId] = subscriber
    } else {
      console.warn('"prototype" and "__proto__" are not valid message names')
    }
  }
  async removeSubscriber(messageName, subscriber) {
    for (let observer in this.suscribers[messageName]) {
      if (this.suscribers[messageName][observer] === subscriber) {
        delete this.suscribers[messageName][observer]
      }
    }
  }
  async update(messageName, payload) {
    for (let subscribers in this.suscribers[messageName]) {
      await this.suscribers[messageName][subscribers](payload)
    }
  }
}
function createObserver() {
  const observer = new Observervable()
  function notify(storeName, hookCall, payload) {
    observer.update(storeName, { storeName, hookCall, payload })
  }
  return {
    observer: observer,
    notify,
  }
}

const atomObservables = {}
const defaultAtomsValues = {}
const defaultAtomsInAtomic = {}
const defaultFiltersInAtomic = {}
const usedKeys = {}
const defaultFiltersValues = {}
const atomsEffectsCleanupFunctons = {}
const pendingAtoms = {}
const atomicStateContext = React.createContext({
  prefix: "store",
})
const AtomicState = ({ children, atoms, filters, prefix = "store" }) => {
  const atomicContext = React.useContext(atomicStateContext)
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
  const memoizedChildren = React.useMemo(() => children, [prefix])
  return React.createElement(
    atomicStateContext.Provider,
    {
      value: {
        prefix: atomicPrefix,
      },
    },
    children
  )
}
const resolvedAtoms = {}
function useAtomCreate(init) {
  const {
    effects = [],
    persist,
    localStoragePersistence,
    sync = true,
    onSync = () => {},
  } = init
  const { prefix } = React.useContext(atomicStateContext)
  const $atomKey = prefix + "-" + init.name
  const [isLSReady, setIsLSReady] = React.useState(false)
  const persistence = localStoragePersistence || persist
  const hydration = true
  const hookCall = React.useMemo(() => `${Math.random()}`.split(".")[1], [])
  if (!($atomKey in atomsEffectsCleanupFunctons)) {
    atomsEffectsCleanupFunctons[$atomKey] = []
  }
  const isDefined = typeof init.default !== "undefined"
  const initialValue = (function getInitialValue() {
    const isFunction =
      typeof defaultAtomsValues[$atomKey] === "undefined" &&
      typeof init.default === "function"
    const initialIfFnOrPromise = isFunction
      ? init.default()
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
              : JSON.parse(localStorage[$atomKey])
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
  const [vIfPersistence, setVIfPersistence] = React.useState(() => {
    try {
      if (hydration) {
        return JSON.parse(localStorage[$atomKey])
      } else return undefined
    } catch (err) {
      return initialValue
    }
  })
  const [state, setState] = React.useState(
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
  const [runEffects, setRunEffects] = React.useState(false)
  const hydrated = React.useRef(false)
  const updateState = React.useCallback(
    async (v) => {
      let willCancel = false
      const newValue = typeof v === "function" ? await v(state) : v
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
              const cancelStateUpdate = await effect({
                previous: state,
                state: newValue,
                dispatch: updateState,
              })
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    async function getPromiseInitialValue() {
      var _a
      // Only resolve promise if default or resolved value are not present
      if (typeof defaultAtomsValues[$atomKey] === "undefined") {
        if (typeof init.default === "function") {
          if (pendingAtoms[$atomKey] === 0) {
            pendingAtoms[$atomKey] += 1
            let v =
              typeof init.default !== "undefined"
                ? (async () =>
                    typeof init.default === "function"
                      ? init.default()
                      : init.default)()
                : undefined
            if (typeof v !== "undefined") {
              v.then((val) => {
                defaultAtomsValues[$atomKey] = val
                notify($atomKey, hookCall, defaultAtomsValues[$atomKey])
                updateState(val)
              })
            }
          } else {
            pendingAtoms[$atomKey] += 1
            if (state || defaultAtomsValues[$atomKey]) {
              ;(_a = atomObservables[$atomKey]) === null || _a === void 0
                ? void 0
                : _a.notify(
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
  React.useEffect(() => {
    return () => {
      pendingAtoms[$atomKey] = 0
    }
  }, [init.name])
  React.useEffect(() => {
    const handler = async (e) => {
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
  React.useEffect(() => {
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
  const actions = React.useMemo(() => init.actions || {}, [])
  const __actions = React.useMemo(
    () =>
      Object.fromEntries(
        Object.keys(actions).map((key) => [
          key,
          (args) =>
            actions[key]({
              args,
              state,
              dispatch: updateState,
            }),
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  )
  return [state, updateState, __actions]
}
const ignoredAtomKeyWarnings = {}
/**
 * Creates an atom containing state
 */
function atom(init) {
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
  const useCreate = () => useAtomCreate(init)
  useCreate["atom-name"] = init.name
  useCreate["init-object"] = init
  return useCreate
}
const createAtom = atom
const objectFilters = {}
const resolvedFilters = {}
const filterObservables = {}
const subscribedFilters = {}
function filter(init) {
  const { name = "", get } = init
  const useFilterGet = () => {
    let filterDeps = {}
    useFilterGet["deps"] = {}
    let depsValues = {}
    const readFilters = {}
    const { prefix } = React.useContext(atomicStateContext)
    const $filterKey = prefix + "-" + name
    if (!filterObservables[$filterKey]) {
      filterObservables[$filterKey] = createObserver()
    }
    const filterObserver = filterObservables[$filterKey]
    const notifyOtherFilters = React.useCallback(
      function notifyOtherFilters(hookCall, payload) {
        filterObserver.notify($filterKey, hookCall, payload)
      },
      [prefix]
    )
    const getObject = React.useMemo(
      () => ({
        get: (atom) => {
          if (typeof atom !== "function") {
            filterDeps[`${prefix}-${atom.name}`] = true
            depsValues[`${prefix}-${atom.name}`] =
              defaultAtomsValues[`${prefix}-${atom.name}`]
            useFilterGet["deps"] = Object.assign(
              Object.assign({}, useFilterGet["deps"]),
              { [`${prefix}-${atom.name}`]: true }
            )
          } else {
            filterDeps[`${prefix}-${atom["atom-name"]}`] = true
            depsValues[`${prefix}-${atom["atom-name"]}`] =
              defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
            useFilterGet["deps"] = Object.assign(
              Object.assign({}, useFilterGet["deps"]),
              { [`${prefix}-${atom["atom-name"]}`]: true }
            )
          }
          return typeof atom !== "function"
            ? defaultAtomsValues[`${prefix}-${atom.name}`]
            : defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
        },
        read: ($filter) => {
          if (typeof $filter !== "function") {
            readFilters[`${prefix}-${$filter.name}`] = true
          } else {
            // We want any re-renders from filters used to trigger a re-render of the current filter
            readFilters[`${prefix}-${$filter["filter-name"]}`] = true
          }
          return typeof $filter !== "function"
            ? defaultFiltersValues[`${prefix}-${$filter.name}`]
            : defaultFiltersValues[`${prefix}-${$filter["filter-name"]}`]
        },
      }),
      [prefix]
    )
    const hookCall = React.useMemo(() => Math.random(), [])
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
    const [filterValue, setFilterValue] = React.useState(
      initialValue instanceof Promise || typeof initialValue === "undefined"
        ? init.default
        : (() => {
            defaultFiltersValues[$filterKey] = initialValue
            return initialValue
          })()
    )
    React.useEffect(() => {
      // Render the first time if initialValue is a promise
      if (initialValue instanceof Promise) {
        initialValue.then((initial) => {
          defaultFiltersValues[$filterKey] = initial
          setFilterValue(initial)
        })
      }
    }, [initialValue])
    async function renderValue(e) {
      if (
        typeof e.payload === "function"
          ? true
          : JSON.stringify(e.payload) !==
            JSON.stringify(depsValues[`${e.storeName}`])
      ) {
        if (`${e.storeName}` in depsValues) {
          depsValues[`${e.storeName}`] = e.payload
        }
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
    React.useEffect(() => {
      var _a, _b
      // Whenever the filter object / function changes, add atoms deps again
      if (!subscribedFilters[$filterKey]) {
        subscribedFilters[$filterKey] = true
        if (defaultFiltersInAtomic[$filterKey]) {
          get(getObject)
        }
        for (let dep in filterDeps) {
          ;(_a = atomObservables[dep]) === null || _a === void 0
            ? void 0
            : _a.observer.addSubscriber(dep, renderValue)
        }
        // We subscribe to any re-renders of filters that our current
        // filter is using
        for (let readFilter in readFilters) {
          ;(_b = filterObservables[readFilter]) === null || _b === void 0
            ? void 0
            : _b.observer.addSubscriber(readFilter, renderValue)
        }
        return () => {
          var _a, _b
          defaultFiltersInAtomic[$filterKey] = true
          for (let dep in filterDeps) {
            ;(_a = atomObservables[dep]) === null || _a === void 0
              ? void 0
              : _a.observer.removeSubscriber(dep, renderValue)
          }
          for (let readFilter in readFilters) {
            ;(_b = filterObservables[readFilter]) === null || _b === void 0
              ? void 0
              : _b.observer.removeSubscriber(readFilter, renderValue)
          }
        }
      }
    }, [init, prefix])
    async function updateValueFromObservableChange(e) {
      const { storeName, payload } = e
      if (hookCall !== e.hookCall) {
        setFilterValue(payload)
      }
    }
    React.useEffect(() => {
      var _a
      ;(_a = filterObserver.observer) === null || _a === void 0
        ? void 0
        : _a.addSubscriber($filterKey, updateValueFromObservableChange)
      return () => {
        var _a
        subscribedFilters[$filterKey] = false
        resolvedFilters[$filterKey] = false
        ;(_a =
          filterObserver === null || filterObserver === void 0
            ? void 0
            : filterObserver.observer) === null || _a === void 0
          ? void 0
          : _a.removeSubscriber($filterKey, updateValueFromObservableChange)
      }
    }, [init, prefix])
    return filterValue
  }
  useFilterGet["filter-name"] = name
  useFilterGet["init-object"] = init
  return useFilterGet
}
function useFilter(f) {
  const { prefix } = React.useContext(atomicStateContext)
  return typeof f !== "function"
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
}
const objectAtoms = {}
/**
 * Get an atom's value and state setter
 */
function useAtom(atom) {
  if (typeof atom !== "function") {
    if (typeof objectAtoms[atom.name] === "undefined") {
      objectAtoms[atom.name] = createAtom(atom)
    } else {
      if (objectAtoms[atom.name]["init-object"] !== atom) {
        objectAtoms[atom.name] = createAtom(atom)
      }
    }
  }
  return typeof atom !== "function" ? objectAtoms[atom.name]() : atom()
}
/**
 * Get an atom's value
 */
function useValue(atom) {
  return useAtom(atom)[0]
}
const useAtomValue = useValue
/**
 * Get the function that updates the atom's value
 */
function useDispatch(atom) {
  return useAtom(atom)[1]
}
const useAtomDispatch = useDispatch
/**
 * Get the actions of the atom as reducers
 */
function useActions(atom) {
  return useAtom(atom)[2]
}
const useAtomActions = useActions
// Selectors section
// localStorage utilities for web apps
const storageOvservable = (() => {
  const emm = new Observervable()
  return emm
})()
/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
function useStorage(defaults) {
  const [keys, setKeys] = React.useState(defaults || {})
  async function updateStore() {
    let $keys = {}
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
    setKeys($keys)
  }
  React.useEffect(() => {
    updateStore()
  }, [])
  React.useEffect(() => {
    storageOvservable.addSubscriber("store-changed", updateStore)
    return () => {
      storageOvservable.removeSubscriber("store-changed", updateStore)
    }
  }, [])
  return keys
}
const storage = {
  /**
   * Set an item in localStorage. Its value will be serialized as JSON
   */
  set(k, v) {
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
  async remove(k) {
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
  get(k, def = null) {
    if (typeof localStorage !== "undefined") {
      if (typeof localStorage.getItem === "function") {
        try {
          return JSON.parse(localStorage.getItem(k))
        } catch (err) {
          return def
        }
      } else {
        try {
          return JSON.parse(localStorage[k])
        } catch (err) {
          return def
        }
      }
    } else {
      return def
    }
  },
}
/**
 * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
 * this hook will update its state
 */
function useStorageItem(k, def = null) {
  const [value, setValue] = React.useState(def)
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
  React.useEffect(() => {
    itemObserver()
    storageOvservable.addSubscriber("store-changed", itemObserver)
    return () => {
      storageOvservable.removeSubscriber("store-changed", itemObserver)
    }
  }, [])
  return value
}