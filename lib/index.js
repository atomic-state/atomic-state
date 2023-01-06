"use strict";
/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStorageItem = exports.storage = exports.useStorage = exports.useAtomActions = exports.useActions = exports.useAtomDispatch = exports.useDispatch = exports.useAtomValue = exports.useValue = exports.useAtom = exports.useFilter = exports.filter = exports.createAtom = exports.atom = exports.getFilterValue = exports.getAtomValue = exports.takeSnapshot = exports.AtomicState = exports.createObserver = void 0;
var react_1 = __importStar(require("react"));
var events_1 = require("events");
function createObserver() {
    var observer = new events_1.EventEmitter();
    observer.setMaxListeners(10e10);
    function notify(storeName, hookCall, payload) {
        observer.emit(storeName, { storeName: storeName, hookCall: hookCall, payload: payload });
    }
    return {
        observer: observer,
        notify: notify,
    };
}
exports.createObserver = createObserver;
var atomObservables = {};
var defaultAtomsValues = {};
var atomsInitializeObjects = {};
var filtersInitializeObjects = {};
var defaultAtomsInAtomic = {};
var defaultFiltersInAtomic = {};
var usedKeys = {};
var defaultFiltersValues = {};
var atomsEffectsCleanupFunctons = {};
var pendingAtoms = {};
var defaultPersistenceProvider = typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem: function () { },
        setItem: function () { },
        removeItem: function () { },
    };
var atomicStateContext = (0, react_1.createContext)({
    prefix: "store",
    persistenceProvider: defaultPersistenceProvider,
});
function AtomInitialize(_a) {
    var atm = _a.atm;
    useAtom(atm);
    return null;
}
function FilterInitialize(_a) {
    var filt = _a.filt;
    useFilter(filt);
    return null;
}
function _isDefined(target) {
    return typeof target !== "undefined";
}
function _isFunction(target) {
    return typeof target === "function";
}
function _isPromise(target) {
    return target instanceof Promise;
}
function jsonEquality(target1, target2) {
    return JSON.stringify(target1) === JSON.stringify(target2);
}
var AtomicState = function (_a) {
    var children = _a.children, atoms = _a.atoms, filters = _a.filters, _b = _a.prefix, prefix = _b === void 0 ? "store" : _b, _c = _a.persistenceProvider, persistenceProvider = _c === void 0 ? defaultPersistenceProvider : _c;
    var atomicContext = (0, react_1.useContext)(atomicStateContext);
    var atomicPrefix = !_isDefined(prefix) ? atomicContext.prefix : prefix;
    if (atoms) {
        for (var atomKey in atoms) {
            var defaultsKey = "".concat(atomicPrefix, "-").concat(atomKey);
            if (!_isDefined(defaultAtomsValues[defaultsKey])) {
                defaultAtomsValues[defaultsKey] = atoms[atomKey];
                defaultAtomsInAtomic[defaultsKey] = true;
            }
        }
    }
    if (filters) {
        for (var filterKey in filters) {
            var defaultsKey = "".concat(atomicPrefix, "-").concat(filterKey);
            if (!_isDefined(defaultFiltersValues[defaultsKey])) {
                defaultFiltersValues[defaultsKey] = filters[filterKey];
                defaultFiltersInAtomic[defaultsKey] = true;
            }
        }
    }
    var createdAtoms = Object.values(atomsInitializeObjects);
    var thisId = (0, react_1.useMemo)(function () { return Math.random(); }, []).toString();
    var initialized = (0, react_1.useMemo)(function () {
        return createdAtoms.map(function (atm) {
            return (react_1.default.createElement(react_1.default.StrictMode, { key: (atm === null || atm === void 0 ? void 0 : atm.name) + prefix + thisId },
                react_1.default.createElement(AtomInitialize, { atm: atm })));
        });
    }, [createdAtoms]);
    var createdFilters = Object.values(filtersInitializeObjects);
    var initializedFilters = (0, react_1.useMemo)(function () {
        return createdFilters.map(function (flt) {
            return (react_1.default.createElement(react_1.default.StrictMode, { key: (flt === null || flt === void 0 ? void 0 : flt.name) + prefix + thisId },
                react_1.default.createElement(FilterInitialize, { filt: flt })));
        });
    }, [createdFilters]);
    return (react_1.default.createElement(atomicStateContext.Provider, { value: {
            prefix: atomicPrefix,
            persistenceProvider: persistenceProvider,
        } },
        react_1.default.createElement(react_1.default.Fragment, null,
            initialized,
            initializedFilters),
        children));
};
exports.AtomicState = AtomicState;
var resolvedAtoms = {};
var persistenceLoaded = {};
/**
 * Take a snapshot of all atoms' and filters' values.
 * You can pass a string with the `prefix` you used in the `AtomicState` root component
 * if you want only atoms and filters using that prefix.
 */
function takeSnapshot(storeName) {
    var stores = {};
    for (var atomKey in defaultAtomsValues) {
        var _a = atomKey.split("-"), prefixName = _a[0], atomName = _a[1];
        if (!_isDefined(stores[prefixName])) {
            stores[prefixName] = {
                filters: {},
                atoms: {},
            };
        }
        stores[prefixName].atoms[atomName] = defaultAtomsValues[atomKey];
    }
    for (var filterKey in defaultFiltersValues) {
        var _b = filterKey.split("-"), prefixName = _b[0], filterName = _b[1];
        if (!_isDefined(stores[prefixName])) {
            stores[prefixName] = {
                filters: {},
                atoms: {},
            };
        }
        stores[prefixName].filters[filterName] = defaultFiltersValues[filterKey];
    }
    return !_isDefined(storeName) ? stores : stores[storeName] || {};
}
exports.takeSnapshot = takeSnapshot;
/**
 * Get the current value of an atom. You can pass a specific prefix as the second argument.
 */
function getAtomValue(atomName, prefix) {
    if (prefix === void 0) { prefix = "store"; }
    var $atomKey = [prefix, atomName].join("-");
    return defaultAtomsValues[$atomKey];
}
exports.getAtomValue = getAtomValue;
/**
 * Get the current value of a filter. You can pass a specific prefix as the second argument.
 */
function getFilterValue(filterName, prefix) {
    if (prefix === void 0) { prefix = "store"; }
    var $filterKey = [prefix, filterName].join("-");
    return defaultFiltersValues[$filterKey];
}
exports.getFilterValue = getFilterValue;
function useAtomCreate(init) {
    var _this = this;
    var _a = (0, react_1.useContext)(atomicStateContext), prefix = _a.prefix, persistenceProvider = _a.persistenceProvider;
    var _b = init.effects, effects = _b === void 0 ? [] : _b, persist = init.persist, localStoragePersistence = init.localStoragePersistence, _c = init.sync, sync = _c === void 0 ? true : _c, _d = init.onSync, onSync = _d === void 0 ? function () { } : _d, _e = init.persistenceProvider, $localStorage = _e === void 0 ? persistenceProvider : _e;
    var $atomKey = prefix + "-" + init.name;
    var _f = (0, react_1.useState)(false), isLSReady = _f[0], setIsLSReady = _f[1];
    var persistence = localStoragePersistence || persist;
    var hookCall = (0, react_1.useMemo)(function () { return "".concat(Math.random()).split(".")[1]; }, []);
    if (!($atomKey in atomsEffectsCleanupFunctons)) {
        atomsEffectsCleanupFunctons[$atomKey] = [];
    }
    var isDefined = _isDefined(init.default);
    var initDef = _isDefined(defaultAtomsValues[$atomKey])
        ? defaultAtomsValues[$atomKey]
        : init.default;
    var initialValue = (function getInitialValue() {
        var isFunction = !_isDefined(defaultAtomsValues[$atomKey]) && _isFunction(init.default);
        var initialIfFnOrPromise = isFunction
            ? init.default()
            : _isPromise(init.default)
                ? init.default
                : undefined;
        var isPromiseValue = _isPromise(initialIfFnOrPromise);
        var initVal = isDefined
            ? !_isDefined(defaultAtomsValues[$atomKey])
                ? !isPromiseValue
                    ? _isDefined(initialIfFnOrPromise)
                        ? initialIfFnOrPromise
                        : initDef
                    : init.default
                : initDef
            : initDef;
        try {
            if (persistence) {
                if (typeof localStorage !== "undefined") {
                    if (!_isDefined(defaultAtomsValues[$atomKey]) ||
                        defaultAtomsInAtomic[$atomKey]) {
                        defaultAtomsInAtomic[$atomKey] = false;
                        defaultAtomsValues[$atomKey] = isPromiseValue ? undefined : initVal;
                    }
                }
            }
            else {
                if (!_isDefined(defaultAtomsValues[$atomKey])) {
                    defaultAtomsValues[$atomKey] = initVal;
                }
            }
            return initVal;
        }
        catch (err) {
            return initVal;
        }
    })();
    var _g = (0, react_1.useState)(function () {
        if (persist) {
            if (typeof window !== "undefined") {
                try {
                    return (function () { return __awaiter(_this, void 0, void 0, function () {
                        var storageItem, _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (!(typeof $localStorage === "undefined")) return [3 /*break*/, 1];
                                    _a = init.default;
                                    return [3 /*break*/, 3];
                                case 1: return [4 /*yield*/, $localStorage.getItem($atomKey)];
                                case 2:
                                    _a = _b.sent();
                                    _b.label = 3;
                                case 3:
                                    storageItem = _a;
                                    return [2 /*return*/, typeof $localStorage === "undefined"
                                            ? init.default
                                            : JSON.parse(storageItem) || initDef];
                            }
                        });
                    }); })();
                }
                catch (err) {
                    return initialValue;
                }
            }
        }
        else
            return undefined;
    }), vIfPersistence = _g[0], setVIfPersistence = _g[1];
    var _h = (0, react_1.useState)((_isPromise(initialValue) || _isFunction(initialValue)) &&
        !_isDefined(defaultAtomsValues[$atomKey])
        ? undefined
        : (function () {
            defaultAtomsValues[$atomKey] = initialValue;
            return initialValue;
        })()), state = _h[0], setState = _h[1];
    if (!pendingAtoms[$atomKey]) {
        pendingAtoms[$atomKey] = 0;
    }
    if (!atomObservables[$atomKey]) {
        atomObservables[$atomKey] = createObserver();
    }
    var _j = atomObservables[$atomKey], observer = _j.observer, notify = _j.notify;
    var _k = (0, react_1.useState)(false), runEffects = _k[0], setRunEffects = _k[1];
    var hydrated = (0, react_1.useRef)(false);
    var updateState = (0, react_1.useCallback)(function (v) {
        var willCancel = false;
        var newValue;
        var hasChanded;
        function cancelUpdate() {
            willCancel = true;
        }
        newValue = _isFunction(v) ? v(defaultAtomsValues[$atomKey]) : v;
        hasChanded = (function () {
            try {
                return !jsonEquality(newValue, defaultAtomsValues[$atomKey]);
            }
            catch (err) {
                return false;
            }
        })();
        var notifyIfValueIsDefault = (function () {
            try {
                if (_isFunction(defaultAtomsValues[$atomKey])) {
                    return true;
                }
                if (jsonEquality(newValue, initDef) && !resolvedAtoms[$atomKey]) {
                    resolvedAtoms[$atomKey] = true;
                    return true;
                }
                else {
                    return false;
                }
            }
            catch (err) {
                return true;
            }
        })();
        var shouldNotifyOtherSubscribers = _isFunction(defaultAtomsValues[$atomKey]) ||
            hasChanded ||
            notifyIfValueIsDefault;
        // We first run every cleanup functions returned in atom effects
        try {
            for (var _i = 0, _a = atomsEffectsCleanupFunctons[$atomKey]; _i < _a.length; _i++) {
                var cleanupFunction = _a[_i];
                cleanupFunction();
            }
        }
        catch (err) {
        }
        finally {
            // We reset all atom cleanup functions
            atomsEffectsCleanupFunctons[$atomKey] = [];
            try {
                for (var _b = 0, effects_1 = effects; _b < effects_1.length; _b++) {
                    var effect = effects_1[_b];
                    var cancelStateUpdate = effect({
                        previous: state,
                        state: newValue,
                        dispatch: updateState,
                        cancel: cancelUpdate,
                    });
                    if (_isPromise(cancelStateUpdate)) {
                        ;
                        cancelStateUpdate.then(function (r) {
                            if (_isDefined(r) && !r) {
                                willCancel = true;
                            }
                            else {
                                if (_isFunction(r)) {
                                    atomsEffectsCleanupFunctons[$atomKey].push(r);
                                }
                            }
                        });
                    }
                    else if (_isDefined(cancelStateUpdate) && !cancelStateUpdate) {
                        willCancel = true;
                    }
                    else {
                        if (_isFunction(cancelStateUpdate)) {
                            atomsEffectsCleanupFunctons[$atomKey].push(cancelStateUpdate);
                        }
                    }
                }
            }
            catch (err) {
                setRunEffects(true);
            }
            finally {
                if (!willCancel) {
                    if (_isDefined(newValue)) {
                        defaultAtomsValues[$atomKey] = newValue;
                        if (persistence) {
                            $localStorage.setItem($atomKey, JSON.stringify(newValue));
                        }
                    }
                    try {
                        if (shouldNotifyOtherSubscribers) {
                            if (_isDefined(newValue)) {
                                notify($atomKey, hookCall, newValue);
                            }
                        }
                    }
                    finally {
                        // Finally update state
                        if (_isDefined(newValue)) {
                            setState(newValue);
                        }
                    }
                }
            }
        }
    }, [
        hookCall,
        notify,
        runEffects,
        $atomKey,
        persistence,
        hydrated,
        state,
        init.name,
    ]);
    (0, react_1.useEffect)(function () {
        function storageListener() {
            return __awaiter(this, void 0, void 0, function () {
                var newState, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof localStorage !== "undefined")) return [3 /*break*/, 5];
                            if (!_isDefined(localStorage[$atomKey])) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            newState = JSON.parse(localStorage[$atomKey]);
                            if (!!jsonEquality(newState, defaultAtomsValues[$atomKey])) return [3 /*break*/, 3];
                            updateState(newState);
                            return [4 /*yield*/, onSync(newState)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [3 /*break*/, 5];
                        case 4:
                            err_1 = _a.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        if (persistence) {
            if (typeof window !== "undefined") {
                if (typeof localStorage !== "undefined") {
                    if ($localStorage === localStorage) {
                        var canListen = _isDefined(window.addEventListener);
                        if (canListen) {
                            if (sync) {
                                window.addEventListener("storage", storageListener);
                                return function () {
                                    window.removeEventListener("storage", storageListener);
                                };
                            }
                        }
                    }
                }
            }
        }
        return function () { };
    }, [init.name, persistence, $localStorage]);
    (0, react_1.useEffect)(function () {
        function loadPersistence() {
            return __awaiter(this, void 0, void 0, function () {
                var tm1_1, tm2_1;
                var _this = this;
                return __generator(this, function (_a) {
                    persistenceLoaded[$atomKey] = true;
                    if (_isDefined(vIfPersistence)) {
                        if (!hydrated.current) {
                            tm1_1 = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                var storageItem;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!persistence) return [3 /*break*/, 2];
                                            return [4 /*yield*/, vIfPersistence];
                                        case 1:
                                            storageItem = _a.sent();
                                            if (!jsonEquality(storageItem, defaultAtomsValues[$atomKey])) {
                                                if (!_isDefined(resolvedAtoms[$atomKey])) {
                                                    updateState(storageItem);
                                                }
                                            }
                                            setIsLSReady(true);
                                            _a.label = 2;
                                        case 2: return [2 /*return*/];
                                    }
                                });
                            }); }, 0);
                            tm2_1 = setTimeout(function () {
                                setVIfPersistence(undefined);
                                hydrated.current = true;
                            }, 0);
                            return [2 /*return*/, function () {
                                    clearTimeout(tm1_1);
                                    clearTimeout(tm2_1);
                                }];
                        }
                    }
                    return [2 /*return*/, function () { }];
                });
            });
        }
        if (!persistenceLoaded[$atomKey]) {
            loadPersistence();
        }
    }, [vIfPersistence, updateState, hydrated, $atomKey]);
    (0, react_1.useEffect)(function () {
        function getPromiseInitialValue() {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var v;
                var _this = this;
                return __generator(this, function (_b) {
                    // Only resolve promise if default or resolved value are not present
                    if (!_isDefined(defaultAtomsValues[$atomKey])) {
                        if (_isFunction(init.default)) {
                            if (pendingAtoms[$atomKey] === 0) {
                                pendingAtoms[$atomKey] += 1;
                                v = _isDefined(init.default)
                                    ? (function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            return [2 /*return*/, _isFunction(init.default)
                                                    ? init.default()
                                                    : init.default];
                                        });
                                    }); })()
                                    : undefined;
                                if (_isDefined(v)) {
                                    ;
                                    v.then(function (val) {
                                        defaultAtomsValues[$atomKey] = val;
                                        notify($atomKey, hookCall, defaultAtomsValues[$atomKey]);
                                        updateState(val);
                                    });
                                }
                            }
                            else {
                                pendingAtoms[$atomKey] += 1;
                                if (state || defaultAtomsValues[$atomKey]) {
                                    (_a = atomObservables[$atomKey]) === null || _a === void 0 ? void 0 : _a.notify($atomKey, hookCall, _isDefined(state) ? state : defaultAtomsValues[$atomKey]);
                                }
                            }
                        }
                    }
                    return [2 /*return*/];
                });
            });
        }
        getPromiseInitialValue();
    }, [state, initDef, updateState, init.name, hookCall]);
    (0, react_1.useEffect)(function () {
        return function () {
            pendingAtoms[$atomKey] = 0;
        };
    }, [init.name]);
    (0, react_1.useEffect)(function () {
        var handler = function (e) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (e.hookCall !== hookCall) {
                    if (_isDefined(e.payload)) {
                        setState(e.payload);
                    }
                }
                return [2 /*return*/];
            });
        }); };
        observer.addListener($atomKey, handler);
        return function () {
            observer.removeListener($atomKey, handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runEffects]);
    (0, react_1.useEffect)(function () {
        function updateStorage() {
            return __awaiter(this, void 0, void 0, function () {
                var storageItem;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof localStorage !== "undefined")) return [3 /*break*/, 2];
                            return [4 /*yield*/, $localStorage.getItem($atomKey)];
                        case 1:
                            storageItem = _a.sent();
                            if (_isDefined(storageItem) || storageItem === null) {
                                // Only remove from localStorage if persistence is false
                                if (!persistence) {
                                    $localStorage.removeItem($atomKey);
                                }
                                else {
                                    if (_isDefined(state)) {
                                        if (!jsonEquality(state, init.default)) {
                                            $localStorage.setItem($atomKey, JSON.stringify(state));
                                        }
                                    }
                                }
                            }
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        }
        updateStorage();
    }, [init.name, persistence, state]);
    var atomGet = (0, react_1.useCallback)(function ($atom) {
        var $key = [prefix, $atom["atom-name"]].join("-");
        var $atomValue = defaultAtomsValues[$key];
        return $atomValue;
    }, [prefix]);
    var filterRead = (0, react_1.useCallback)(function ($filter) {
        var $key = [prefix, $filter["filter-name"]].join("-");
        var $filterValue = defaultFiltersValues[$key];
        return $filterValue;
    }, [prefix]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    var actions = (0, react_1.useMemo)(function () { return init.actions || {}; }, [init.actions]);
    var __actions = (0, react_1.useMemo)(function () {
        return Object.fromEntries(Object.keys(actions).map(function (key) { return [
            key,
            function (args) {
                return actions[key]({
                    args: args,
                    state: state,
                    dispatch: updateState,
                    get: atomGet,
                    read: filterRead,
                });
            },
        ]; }));
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]);
    return [
        state,
        updateState,
        __actions,
    ];
}
var ignoredAtomKeyWarnings = {};
/**
 * Creates an atom containing state
 */
function atom(init) {
    if (init.ignoreKeyWarning) {
        ignoredAtomKeyWarnings[init.name] = true;
    }
    usedKeys[init.name] = true;
    if (!atomsInitializeObjects[init === null || init === void 0 ? void 0 : init.name]) {
        atomsInitializeObjects[init === null || init === void 0 ? void 0 : init.name] = init;
    }
    var useCreate = function () { return useAtomCreate(init); };
    useCreate["atom-name"] = init.name;
    useCreate["init-object"] = init;
    return useCreate;
}
exports.atom = atom;
exports.createAtom = atom;
var objectFilters = {};
var resolvedFilters = {};
var filterObservables = {};
var subscribedFilters = {};
function filter(init) {
    var _this = this;
    if (!_isDefined(filtersInitializeObjects[init === null || init === void 0 ? void 0 : init.name])) {
        filtersInitializeObjects[init === null || init === void 0 ? void 0 : init.name] = init;
    }
    var _a = filtersInitializeObjects[init === null || init === void 0 ? void 0 : init.name].name, name = _a === void 0 ? "" : _a;
    var filterDeps = {};
    var $resolving = {};
    var readFilters = {};
    var readFiltersValues = {};
    var depsValues = {};
    var useFilterGet = function () {
        var hookCall = (0, react_1.useMemo)(function () { return Math.random(); }, []);
        var prefix = (0, react_1.useContext)(atomicStateContext).prefix;
        if (!filterDeps["".concat(prefix, "-")]) {
            filterDeps["".concat(prefix, "-")] = {};
        }
        var $filterKey = prefix + "-" + name;
        if (!filterObservables[$filterKey]) {
            filterObservables[$filterKey] = createObserver();
        }
        var filterObserver = filterObservables[$filterKey];
        var notifyOtherFilters = (0, react_1.useCallback)(function notifyOtherFilters(hookCall, payload) {
            filterObserver.notify($filterKey, hookCall, payload);
        }, [prefix, hookCall, $filterKey]);
        for (var dep in filterDeps["".concat(prefix, "-")]) {
            if (depsValues[dep] !== defaultAtomsValues[dep]) {
                resolvedFilters[$filterKey] = false;
            }
        }
        for (var dep in readFilters) {
            if (readFiltersValues[dep] !== defaultFiltersValues[dep]) {
                resolvedFilters[$filterKey] = false;
            }
        }
        var getObject = (0, react_1.useMemo)(function () { return ({
            get: function ($atom) {
                var _a;
                subscribedFilters[$filterKey] = true;
                if (!_isFunction($atom)) {
                    var depsKey = [prefix, $atom.name].join("-");
                    filterDeps["".concat(prefix, "-")][depsKey] = true;
                    depsValues[depsKey] = defaultAtomsValues[depsKey];
                }
                else {
                    var depsKey = [prefix, (_a = $atom === null || $atom === void 0 ? void 0 : $atom["init-object"]) === null || _a === void 0 ? void 0 : _a.name].join("-");
                    filterDeps["".concat(prefix, "-")][depsKey] = true;
                    depsValues[depsKey] = defaultAtomsValues[depsKey];
                }
                var __valuesKey = [prefix, atom.name].join("-");
                var __valuesKeyNames = [prefix, $atom["atom-name"]].join("-");
                return !_isFunction($atom)
                    ? !_isDefined(defaultAtomsValues[__valuesKey])
                        ? $atom.default
                        : defaultAtomsValues[__valuesKey]
                    : !_isDefined(defaultAtomsValues[__valuesKeyNames])
                        ? $atom["init-object"].default
                        : defaultAtomsValues[__valuesKeyNames];
            },
            read: function ($filter) {
                var _a;
                subscribedFilters[$filterKey] = true;
                var __filtersKey = !_isFunction($filter)
                    ? [prefix, $filter.name].join("-")
                    : [prefix, $filter["filter-name"]].join("-");
                if (!_isFunction($filter)) {
                    readFilters[__filtersKey] = true;
                    readFiltersValues[__filtersKey] = defaultFiltersValues[__filtersKey];
                }
                else {
                    // We want any re-renders from filters used to trigger a re-render of the current filter
                    readFilters[__filtersKey] = true;
                    readFiltersValues[__filtersKey] = defaultFiltersValues[__filtersKey];
                }
                return !_isFunction($filter)
                    ? !_isDefined(defaultFiltersValues[__filtersKey])
                        ? $filter.default
                        : defaultFiltersValues[__filtersKey]
                    : !_isDefined(defaultFiltersValues[__filtersKey])
                        ? (_a = $filter["init-object"]) === null || _a === void 0 ? void 0 : _a.default
                        : defaultFiltersValues[__filtersKey];
            },
        }); }, [prefix]);
        function getInitialValue() {
            var _this = this;
            try {
                var firstResolved_1 = undefined;
                return !resolvedFilters[$filterKey]
                    ? (function () {
                        var _a;
                        resolvedFilters[$filterKey] = true;
                        defaultFiltersValues[$filterKey] = init.default;
                        try {
                            firstResolved_1 = (_a = filtersInitializeObjects[name]) === null || _a === void 0 ? void 0 : _a.get(getObject);
                            if (!_isDefined(firstResolved_1)) {
                                return init.default;
                            }
                            else {
                                ;
                                (function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, firstResolved_1];
                                            case 1:
                                                firstResolved_1 = _a.sent();
                                                defaultFiltersValues[$filterKey] = firstResolved_1;
                                                // This hook will notify itself if any deps have changed
                                                if (_isDefined(firstResolved_1)) {
                                                    notifyOtherFilters("", firstResolved_1);
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })();
                                return firstResolved_1;
                            }
                        }
                        catch (err) {
                        }
                        finally {
                            if (_isDefined(firstResolved_1)) {
                                notifyOtherFilters("", firstResolved_1);
                            }
                            return firstResolved_1;
                        }
                    })()
                    : (function () {
                        return defaultFiltersValues[$filterKey];
                    })();
            }
            catch (err) {
                return init.default;
            }
        }
        var defValue = defaultFiltersValues[$filterKey];
        var initialValue = getInitialValue();
        resolvedFilters[$filterKey] = true;
        if (_isPromise(initialValue)) {
            defaultFiltersValues[$filterKey] = initialValue;
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _a = defaultFiltersValues;
                            _b = $filterKey;
                            return [4 /*yield*/, initialValue];
                        case 1:
                            _a[_b] = _e.sent();
                            _c = notifyOtherFilters;
                            _d = [hookCall];
                            return [4 /*yield*/, defaultFiltersValues[$filterKey]];
                        case 2:
                            _c.apply(void 0, _d.concat([_e.sent()]));
                            return [2 /*return*/];
                    }
                });
            }); }, 0);
        }
        if (_isDefined(initialValue)) {
            if (_isPromise(initialValue)) {
                initialValue.then(function (e) {
                    defValue = e;
                    defaultFiltersValues[$filterKey] = e;
                    filterObserver.notify($filterKey, "", e);
                });
            }
            else {
                defValue = initialValue;
                defaultFiltersValues[$filterKey] = initialValue;
            }
        }
        else {
            if (!_isDefined(defValue)) {
                defValue = init.default;
            }
        }
        var _a = (0, react_1.useState)(function () {
            return _isDefined(defValue)
                ? _isPromise(defValue)
                    ? _isPromise(initialValue)
                        ? init.default
                        : initialValue
                    : defValue
                : (function () {
                    return defValue;
                })();
        }), filterValue = _a[0], setFilterValue = _a[1];
        (0, react_1.useEffect)(function () {
            var _a;
            (_a = atomObservables[$filterKey]) === null || _a === void 0 ? void 0 : _a.notify($filterKey, "", filterValue);
        }, [filterValue]);
        (0, react_1.useEffect)(function () {
            if (!resolvedFilters[$filterKey]) {
                if (_isDefined(filterValue)) {
                    notifyOtherFilters(hookCall, filterValue);
                }
            }
        }, [filterValue, hookCall, $filterKey, resolvedFilters[$filterKey]]);
        (0, react_1.useEffect)(function () {
            // Render the first time if initialValue is a promise
            if (_isPromise(initialValue)) {
                initialValue.then(function (initial) {
                    if (_isDefined(initial)) {
                        defaultFiltersValues[$filterKey] = initial;
                        setFilterValue(initial);
                    }
                });
            }
        }, [initialValue]);
        function renderValue(e) {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var isFilterUpdate, newValue_1;
                var _this = this;
                return __generator(this, function (_b) {
                    isFilterUpdate = e.storeName in readFilters;
                    if (_isFunction(e.payload)
                        ? true
                        : isFilterUpdate
                            ? !jsonEquality(defaultFiltersValues[e.storeName], readFiltersValues[e.storeName])
                            : !jsonEquality(e.payload, depsValues[e.storeName])) {
                        if (e.storeName in
                            (isFilterUpdate ? readFilters : filterDeps["".concat(prefix, "-")])) {
                            if (_isDefined(e.payload)) {
                                if (isFilterUpdate) {
                                    readFiltersValues[e.storeName] = e.payload;
                                }
                                else {
                                    depsValues[e.storeName] = e.payload;
                                }
                            }
                        }
                        try {
                            if (!$resolving[$filterKey]) {
                                $resolving[$filterKey] = true;
                                newValue_1 = e.storeName in filterDeps["".concat(prefix, "-")] ||
                                    e.storeName in readFilters
                                    ? (_a = filtersInitializeObjects[name]) === null || _a === void 0 ? void 0 : _a.get(getObject)
                                    : defaultFiltersValues[$filterKey];
                                defaultFiltersValues[$filterKey] = newValue_1;
                                (function () { return __awaiter(_this, void 0, void 0, function () {
                                    var newV;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!_isFunction(newValue_1)) return [3 /*break*/, 1];
                                                notifyOtherFilters(hookCall, newValue_1);
                                                setFilterValue(function () { return newValue_1; });
                                                return [3 /*break*/, 4];
                                            case 1:
                                                if (!_isDefined(newValue_1)) return [3 /*break*/, 4];
                                                if (!_isPromise(newValue_1)) return [3 /*break*/, 3];
                                                return [4 /*yield*/, newValue_1];
                                            case 2:
                                                newV = _a.sent();
                                                setFilterValue(newV);
                                                notifyOtherFilters(hookCall, newV);
                                                return [3 /*break*/, 4];
                                            case 3:
                                                setFilterValue(newValue_1);
                                                notifyOtherFilters(hookCall, newValue_1);
                                                _a.label = 4;
                                            case 4:
                                                $resolving[$filterKey] = false;
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })();
                            }
                        }
                        catch (err) { }
                    }
                    return [2 /*return*/];
                });
            });
        }
        (0, react_1.useEffect)(function () {
            // Whenever the filter object / function changes, add atoms deps again
            var _a, _b;
            for (var dep in filterDeps["".concat(prefix, "-")]) {
                (_a = atomObservables[dep]) === null || _a === void 0 ? void 0 : _a.observer.addListener(dep, renderValue);
            }
            // We subscribe to any re-renders of filters that our current filter is using
            for (var readFilter in readFilters) {
                (_b = filterObservables[readFilter]) === null || _b === void 0 ? void 0 : _b.observer.addListener(readFilter, renderValue);
            }
            return function () {
                var _a, _b;
                for (var dep in filterDeps["".concat(prefix, "-")]) {
                    (_a = atomObservables[dep]) === null || _a === void 0 ? void 0 : _a.observer.removeListener(dep, renderValue);
                }
                for (var readFilter in readFilters) {
                    (_b = filterObservables[readFilter]) === null || _b === void 0 ? void 0 : _b.observer.removeListener(readFilter, renderValue);
                }
            };
        }, []);
        function updateValueFromObservableChange(e) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, $payload_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            payload = e.payload;
                            if (!(hookCall !== e.hookCall)) return [3 /*break*/, 2];
                            return [4 /*yield*/, payload];
                        case 1:
                            $payload_1 = _a.sent();
                            if (_isFunction($payload_1)) {
                                setFilterValue(function () { return $payload_1; });
                            }
                            else {
                                if (_isDefined($payload_1)) {
                                    setFilterValue($payload_1);
                                }
                            }
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        }
        (0, react_1.useEffect)(function () {
            var _a;
            (_a = filterObserver.observer) === null || _a === void 0 ? void 0 : _a.addListener($filterKey, updateValueFromObservableChange);
            return function () {
                var _a;
                (_a = filterObserver === null || filterObserver === void 0 ? void 0 : filterObserver.observer) === null || _a === void 0 ? void 0 : _a.removeListener($filterKey, updateValueFromObservableChange);
            };
        }, [$filterKey]);
        return filterValue;
    };
    useFilterGet["filter-name"] = name;
    useFilterGet["init-object"] = init;
    return useFilterGet;
}
exports.filter = filter;
function useFilter(f) {
    var prefix = (0, react_1.useContext)(atomicStateContext).prefix;
    if (_isFunction(f)) {
        var $f = f["init-object"];
        if ($f !== filtersInitializeObjects[$f === null || $f === void 0 ? void 0 : $f.name]) {
            if (_isDefined($f)) {
                ;
                (filtersInitializeObjects[$f === null || $f === void 0 ? void 0 : $f.name] || {}).get = $f === null || $f === void 0 ? void 0 : $f.get;
            }
        }
    }
    else {
        if (filtersInitializeObjects[f.name] !== f) {
            ;
            (filtersInitializeObjects[f === null || f === void 0 ? void 0 : f.name] || {}).get = f === null || f === void 0 ? void 0 : f.get;
        }
    }
    return (!_isFunction(f)
        ? (function () {
            var __filterSKey = [prefix, f.name].join("-");
            if (!_isDefined(objectFilters[__filterSKey])) {
                objectFilters[__filterSKey] = filter(filtersInitializeObjects[f.name]);
            }
            else {
                if (objectFilters[__filterSKey]["init-object"] !== f) {
                    objectFilters[__filterSKey] = filter(f);
                }
            }
            return objectFilters[__filterSKey]();
        })()
        : f());
}
exports.useFilter = useFilter;
var objectAtoms = {};
/**
 * Get an atom's value and state setter
 */
function useAtom(atom) {
    if (!_isFunction(atom)) {
        if (!_isDefined(objectAtoms[atom.name])) {
            objectAtoms[atom.name] = (0, exports.createAtom)(atom);
        }
        else {
            if (objectAtoms[atom.name]["init-object"] !== atom) {
                objectAtoms[atom.name] = (0, exports.createAtom)(atom);
            }
        }
    }
    return (!_isFunction(atom) ? objectAtoms[atom.name]() : atom());
}
exports.useAtom = useAtom;
/**
 * Get an atom's value
 */
function useValue(atom) {
    return useAtom(atom)[0];
}
exports.useValue = useValue;
exports.useAtomValue = useValue;
/**
 * Get the function that updates the atom's value
 */
function useDispatch(atom) {
    return useAtom(atom)[1];
}
exports.useDispatch = useDispatch;
exports.useAtomDispatch = useDispatch;
/**
 * Get the actions of the atom as reducers
 */
function useActions(atom) {
    return useAtom(atom)[2];
}
exports.useActions = useActions;
exports.useAtomActions = useActions;
var storageOvservable = (function () {
    var emm = new events_1.EventEmitter();
    return emm;
})();
/**
 * Get all localStorage items as an object (they will be JSON parsed). You can pass default values (which work with SSR) and a type argument
 */
function useStorage(defaults) {
    var _a = (0, react_1.useState)((defaults || {})), keys = _a[0], setKeys = _a[1];
    function updateStore() {
        return __awaiter(this, void 0, void 0, function () {
            var $keys, k;
            return __generator(this, function (_a) {
                $keys = {};
                if (typeof localStorage !== "undefined") {
                    for (k in localStorage) {
                        if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
                            try {
                                if (_isDefined(localStorage[k])) {
                                    $keys[k] = JSON.parse(localStorage[k]);
                                }
                            }
                            catch (err) {
                                $keys[k] = localStorage[k];
                            }
                        }
                    }
                }
                setKeys($keys);
                return [2 /*return*/];
            });
        });
    }
    (0, react_1.useEffect)(function () {
        updateStore();
    }, []);
    (0, react_1.useEffect)(function () {
        storageOvservable.addListener("store-changed", updateStore);
        return function () {
            storageOvservable.removeListener("store-changed", updateStore);
        };
    }, []);
    return keys;
}
exports.useStorage = useStorage;
exports.storage = {
    /**
     * Set an item in localStorage. Its value will be serialized as JSON
     */
    set: function (k, v) {
        if (typeof localStorage !== "undefined") {
            if (_isFunction(localStorage.setItem)) {
                localStorage.setItem(k, JSON.stringify(v));
                storageOvservable.emit("store-changed", v);
            }
        }
    },
    /**
     * Remove a localStorage item
     */
    remove: function (k) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof localStorage !== "undefined") {
                    if (_isFunction(localStorage.removeItem)) {
                        localStorage.removeItem(k);
                        storageOvservable.emit("store-changed", {});
                    }
                }
                return [2 /*return*/];
            });
        });
    },
    /**
     * Get an item in localStorage. Its value will be JSON parsed. If it does not exist or
     * is an invalid JSON format, the default value passed in the second argument will be returned
     */
    get: function (k, def) {
        if (def === void 0) { def = null; }
        if (typeof localStorage !== "undefined") {
            if (_isFunction(localStorage.getItem)) {
                try {
                    return JSON.parse(localStorage.getItem(k));
                }
                catch (err) {
                    return def;
                }
            }
            else {
                try {
                    return JSON.parse(localStorage[k]);
                }
                catch (err) {
                    return def;
                }
            }
        }
        else {
            return def;
        }
    },
};
/**
 * Get a localStorage item. Whenever `storage.set` or `storage.remove` are called,
 * this hook will update its state
 */
function useStorageItem(k, def) {
    if (def === void 0) { def = null; }
    var _a = (0, react_1.useState)(def), value = _a[0], setValue = _a[1];
    var itemObserver = function () {
        if (typeof localStorage !== "undefined") {
            if (!jsonEquality(localStorage[k], def)) {
                try {
                    setValue(JSON.parse(localStorage[k]));
                }
                catch (err) {
                    setValue(def);
                }
            }
        }
    };
    (0, react_1.useEffect)(function () {
        itemObserver();
        storageOvservable.addListener("store-changed", itemObserver);
        return function () {
            storageOvservable.removeListener("store-changed", itemObserver);
        };
    }, []);
    return value;
}
exports.useStorageItem = useStorageItem;
