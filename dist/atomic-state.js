/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * An observable class that uses the observer pattern
 */
;(() => {
  const {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
  } = React
  class Observable {
    constructor() {
      this.suscribers = {}
    }
    async addListener(messageName, subscriber) {
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
    async removeListener(messageName, subscriber) {
      for (let observer in this.suscribers[messageName]) {
        if (this.suscribers[messageName][observer] === subscriber) {
          delete this.suscribers[messageName][observer]
        }
      }
    }
    emit(messageName, payload) {
      for (let subscribers in this.suscribers[messageName]) {
        this.suscribers[messageName][subscribers](payload)
      }
    }
  }
  function createObserver() {
    const observer = new Observable()
    function notify(storeName, hookCall, payload) {
      observer.emit(storeName, { storeName, hookCall, payload })
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
  const atomicStateContext = createContext({
    prefix: "store",
  })
  const AtomicState = ({ children, atoms, filters, prefix = "store" }) => {
    const atomicContext = useContext(atomicStateContext)
    let atomicPrefix =
      typeof prefix === "undefined" ? atomicContext.prefix : prefix
    if (atoms) {
      for (let atomKey in atoms) {
        if (
          typeof defaultAtomsValues[`${atomicPrefix}-${atomKey}`] ===
          "undefined"
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

    const createdAtoms = Object.values(atomsInitializeObjects)

    const initialized = useMemo(
      () =>
        createdAtoms.map((atm) => {
          return React.createElement(AtomInitialize, {
            key: atm.name + prefix,
            atm: atm,
          })
        }),
      []
    )

    return React.createElement(
      atomicStateContext.Provider,
      {
        value: {
          prefix: atomicPrefix,
        },
      },
      initialized,
      children
    )
  }
  const resolvedAtoms = {}
  const persistenceLoaded = {}

  /**
   * Take a snapshot of all atoms' and filters' values.
   * You can pass a string with the `prefix` you used in the `AtomicState` root component
   * if you want only atoms and filters using that prefix.
   */
  function takeSnapshot(storeName) {
    let stores = {}

    for (let atomKey in defaultAtomsValues) {
      const [prefixName, atomName] = atomKey.split("-")
      if (typeof stores[prefixName] === "undefined") {
        stores[prefixName] = {
          filters: {},
          atoms: {},
        }
      }
      stores[prefixName].atoms[atomName] = defaultAtomsValues[atomKey]
    }

    for (let filterKey in defaultFiltersValues) {
      const [prefixName, filterName] = filterKey.split("-")
      if (typeof stores[prefixName] === "undefined") {
        stores[prefixName] = {
          filters: {},
          atoms: {},
        }
      }
      stores[prefixName].filters[filterName] = defaultFiltersValues[filterKey]
    }
    return typeof storeName === "undefined" ? stores : stores[storeName] || {}
  }

  /**
   * Get the current value of an atom. You can pass a specific prefix as the second argument.
   */
  function getAtomValue(atomName, prefix = "store") {
    const $atomKey = [prefix, atomName].join("-")
    return defaultAtomsValues[$atomKey]
  }

  /**
   * Get the current value of a filter. You can pass a specific prefix as the second argument.
   */
  function getFilterValue(filterName, prefix = "store") {
    const $filterKey = [prefix, filterName].join("-")
    return defaultFiltersValues[$filterKey]
  }

  function useAtomCreate(init) {
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
                : initVal
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
            : JSON.parse(storageItem) || init.default
        })()
      } catch (err) {
        return initialValue
      }
    })
    const [state, setState] = useState(
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
    const updateState = useCallback(
      (v) => {
        let willCancel = false
        let newValue
        let hasChanded
        function cancelUpdate() {
          willCancel = true
        }
        newValue = typeof v === "function" ? v(state) : v
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
              })

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
      [hookCall, notify, runEffects, persistence, hydrated, state, init.name]
    )
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
    }, [vIfPersistence, updateState, hydrated])
    useEffect(() => {
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
    useEffect(() => {
      return () => {
        pendingAtoms[$atomKey] = 0
      }
    }, [init.name])
    useEffect(() => {
      const handler = async (e) => {
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
            } else {
              localStorage.setItem($atomKey, JSON.stringify(state))
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
    let filterDeps = {}
    let $resolving = {}
    const useFilterGet = () => {
      let depsValues = {}
      let readFilters = {}
      useFilterGet["deps"] = {}
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
        function notifyOtherFilters(hookCall, payload) {
          filterObserver.notify($filterKey, hookCall, payload)
        },
        [prefix, $filterKey]
      )
      const getObject = useMemo(
        () => ({
          get: (atom) => {
            if (typeof atom !== "function") {
              filterDeps[`${prefix}-`][`${prefix}-${atom.name}`] = true
              depsValues[`${prefix}-${atom.name}`] =
                defaultAtomsValues[`${prefix}-${atom.name}`]
              useFilterGet["deps"] = Object.assign(
                Object.assign({}, useFilterGet["deps"]),
                { [`${prefix}-${atom.name}`]: true }
              )
            } else {
              filterDeps[`${prefix}-`][`${prefix}-${atom["atom-name"]}`] = true
              depsValues[`${prefix}-${atom["atom-name"]}`] =
                defaultAtomsValues[`${prefix}-${atom["atom-name"]}`]
              useFilterGet["deps"] = Object.assign(
                Object.assign({}, useFilterGet["deps"]),
                { [`${prefix}-${atom["atom-name"]}`]: true }
              )
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
          read: ($filter) => {
            var _a
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
              ? (_a = $filter["init-object"]) === null || _a === void 0
                ? void 0
                : _a.default
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
      const [filterValue, setFilterValue] = useState(() =>
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

      async function renderValue(e) {
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
                if (typeof newValue === "function") {
                  setFilterValue(() => newValue)
                } else {
                  setFilterValue(newValue)
                }
                $resolving[$filterKey] = false
                clearTimeout(tm)
              }, 0)
            }
          } catch (err) {}
        }
      }
      useEffect(() => {
        var _a, _b
        // Whenever the filter object / function changes, add atoms deps again
        if (!subscribedFilters[$filterKey]) {
          subscribedFilters[$filterKey] = true
          if (!resolvedFilters[$filterKey]) {
            get(getObject)
          }
          for (let dep in filterDeps[`${prefix}-`]) {
            ;(_a = atomObservables[dep]) === null || _a === void 0
              ? void 0
              : _a.observer.addListener(dep, renderValue)
          }
          // We subscribe to any re-renders of filters that our current
          // filter is using
          for (let readFilter in readFilters) {
            ;(_b = filterObservables[readFilter]) === null || _b === void 0
              ? void 0
              : _b.observer.addListener(readFilter, renderValue)
          }
          return () => {
            var _a, _b
            defaultFiltersInAtomic[$filterKey] = true
            for (let dep in filterDeps[`${prefix}-`]) {
              ;(_a = atomObservables[dep]) === null || _a === void 0
                ? void 0
                : _a.observer.removeListener(dep, renderValue)
            }
            for (let readFilter in readFilters) {
              ;(_b = filterObservables[readFilter]) === null || _b === void 0
                ? void 0
                : _b.observer.removeListener(readFilter, renderValue)
            }
          }
        }
      }, [init, prefix])
      async function updateValueFromObservableChange(e) {
        const { storeName, payload } = e
        if (hookCall !== e.hookCall) {
          if (typeof payload === "function") {
            setFilterValue(() => payload)
          } else {
            setFilterValue(payload)
          }
        }
      }
      useEffect(() => {
        var _a
        ;(_a = filterObserver.observer) === null || _a === void 0
          ? void 0
          : _a.addListener($filterKey, updateValueFromObservableChange)
        return () => {
          var _a
          subscribedFilters[$filterKey] = false
          // resolvedFilters[$filterKey] = false
          ;(_a =
            filterObserver === null || filterObserver === void 0
              ? void 0
              : filterObserver.observer) === null || _a === void 0
            ? void 0
            : _a.removeListener($filterKey, updateValueFromObservableChange)
        }
      }, [init, prefix, filterValue])
      return filterValue
    }
    useFilterGet["filter-name"] = name
    useFilterGet["init-object"] = init
    return useFilterGet
  }
  function useFilter(f) {
    const { prefix } = useContext(atomicStateContext)
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
    const emm = new Observable()
    return emm
  })()
  /**
   * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
   */
  function useStorage(defaults) {
    const [keys, setKeys] = useState(defaults || {})
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
  const storage = {
    /**
     * Set an item in localStorage. Its value will be serialized as JSON
     */
    set(k, v) {
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
    async remove(k) {
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

  window.atom = atom
  window.useAtom = useAtom
  window.useValue = useValue
  window.useDispatch = useDispatch
  window.useActions = useActions
  window.AtomicState = AtomicState
  window.takeSnapshot = takeSnapshot
  window.getAtomValue = getAtomValue
  window.getFilterValue = getFilterValue
  window.filter = filter
  window.useFilter = useFilter
  window.storage = storage
  window.useStorage = useStorage
  window.useStorageItem = useStorageItem
})()
