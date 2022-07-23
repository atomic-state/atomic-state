"use strict";
/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.useStorageItem = exports.storage = exports.useStorage = exports.useAtomActions = exports.useActions = exports.useAtomDispatch = exports.useDispatch = exports.useAtomValue = exports.useValue = exports.useAtom = exports.useFilter = exports.filter = exports.createAtom = exports.atom = exports.AtomicState = exports.createObserver = void 0;
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
var defaultAtomsInAtomic = {};
var defaultFiltersInAtomic = {};
var usedKeys = {};
var defaultFiltersValues = {};
var atomsEffectsCleanupFunctons = {};
var pendingAtoms = {};
var atomicStateContext = (0, react_1.createContext)({
    prefix: "store",
});
var AtomicState = function (_a) {
    var children = _a.children, atoms = _a.atoms, filters = _a.filters, _b = _a.prefix, prefix = _b === void 0 ? "store" : _b;
    var atomicContext = (0, react_1.useContext)(atomicStateContext);
    var atomicPrefix = typeof prefix === "undefined" ? atomicContext.prefix : prefix;
    if (atoms) {
        for (var atomKey in atoms) {
            if (typeof defaultAtomsValues["".concat(atomicPrefix, "-").concat(atomKey)] === "undefined") {
                defaultAtomsValues["".concat(atomicPrefix, "-").concat(atomKey)] = atoms[atomKey];
                defaultAtomsInAtomic["".concat(atomicPrefix, "-").concat(atomKey)] = true;
            }
        }
    }
    if (filters) {
        for (var filterKey in filters) {
            if (typeof defaultFiltersValues["".concat(atomicPrefix, "-").concat(filterKey)] ===
                "undefined") {
                defaultFiltersValues["".concat(atomicPrefix, "-").concat(filterKey)] =
                    filters[filterKey];
                defaultFiltersInAtomic["".concat(atomicPrefix, "-").concat(filterKey)] = true;
            }
        }
    }
    var memoizedChildren = (0, react_1.useMemo)(function () { return children; }, [prefix]);
    return (react_1.default.createElement(atomicStateContext.Provider, { value: {
            prefix: atomicPrefix,
        } }, children));
};
exports.AtomicState = AtomicState;
var resolvedAtoms = {};
function useAtomCreate(init) {
    var _this = this;
    var _a = init.effects, effects = _a === void 0 ? [] : _a, persist = init.persist, localStoragePersistence = init.localStoragePersistence, _b = init.sync, sync = _b === void 0 ? true : _b, _c = init.onSync, onSync = _c === void 0 ? function () { } : _c;
    var prefix = (0, react_1.useContext)(atomicStateContext).prefix;
    var $atomKey = prefix + "-" + init.name;
    var _d = (0, react_1.useState)(false), isLSReady = _d[0], setIsLSReady = _d[1];
    var persistence = localStoragePersistence || persist;
    var hookCall = (0, react_1.useMemo)(function () { return "".concat(Math.random()).split(".")[1]; }, []);
    if (!($atomKey in atomsEffectsCleanupFunctons)) {
        atomsEffectsCleanupFunctons[$atomKey] = [];
    }
    var isDefined = typeof init.default !== "undefined";
    var initialValue = (function getInitialValue() {
        var isFunction = typeof defaultAtomsValues[$atomKey] === "undefined" &&
            typeof init.default === "function";
        var initialIfFnOrPromise = isFunction
            ? init.default()
            : init.default instanceof Promise
                ? init.default
                : undefined;
        var isPromiseValue = initialIfFnOrPromise instanceof Promise;
        var initVal = isDefined
            ? typeof defaultAtomsValues[$atomKey] === "undefined"
                ? !isPromiseValue
                    ? typeof initialIfFnOrPromise !== "undefined"
                        ? initialIfFnOrPromise
                        : init.default
                    : init.default
                : defaultAtomsValues[$atomKey]
            : defaultAtomsValues[$atomKey];
        try {
            if (persistence) {
                if (typeof localStorage !== "undefined") {
                    if (typeof defaultAtomsValues[$atomKey] === "undefined" ||
                        defaultAtomsInAtomic[$atomKey]) {
                        defaultAtomsInAtomic[$atomKey] = false;
                        defaultAtomsValues[$atomKey] = isPromiseValue ? undefined : initVal;
                    }
                }
            }
            else {
                if (typeof defaultAtomsValues[$atomKey] === "undefined") {
                    defaultAtomsValues[$atomKey] = initVal;
                }
            }
            return initVal;
        }
        catch (err) {
            return initVal;
        }
    })();
    var _e = (0, react_1.useState)(function () {
        try {
            return (function () { return __awaiter(_this, void 0, void 0, function () {
                var storageItem, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(typeof localStorage === "undefined")) return [3 /*break*/, 1];
                            _a = init.default;
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, localStorage.getItem($atomKey)];
                        case 2:
                            _a = _b.sent();
                            _b.label = 3;
                        case 3:
                            storageItem = _a;
                            return [2 /*return*/, typeof localStorage === "undefined"
                                    ? init.default
                                    : JSON.parse(storageItem) || init.default];
                    }
                });
            }); })();
        }
        catch (err) {
            return initialValue;
        }
    }), vIfPersistence = _e[0], setVIfPersistence = _e[1];
    var _f = (0, react_1.useState)((initialValue instanceof Promise || typeof initialValue === "function") &&
        typeof defaultAtomsValues[$atomKey] === "undefined"
        ? undefined
        : (function () {
            defaultAtomsValues[$atomKey] = initialValue;
            return initialValue;
        })()), state = _f[0], setState = _f[1];
    if (!pendingAtoms[$atomKey]) {
        pendingAtoms[$atomKey] = 0;
    }
    if (!atomObservables[$atomKey]) {
        atomObservables[$atomKey] = createObserver();
    }
    var _g = atomObservables[$atomKey], observer = _g.observer, notify = _g.notify;
    var _h = (0, react_1.useState)(false), runEffects = _h[0], setRunEffects = _h[1];
    var hydrated = (0, react_1.useRef)(false);
    var updateState = (0, react_1.useCallback)(function (v, isActionUpdate) {
        var willCancel = false;
        var newValue;
        var hasChanded;
        function cancelUpdate() {
            willCancel = true;
        }
        newValue = typeof v === "function" ? v(state) : v;
        hasChanded = (function () {
            try {
                return (JSON.stringify(newValue) !==
                    JSON.stringify(defaultAtomsValues[$atomKey]));
            }
            catch (err) {
                return false;
            }
        })();
        var notifyIfValueIsDefault = (function () {
            try {
                if (typeof defaultAtomsValues[$atomKey] === "function") {
                    return true;
                }
                if (JSON.stringify(newValue) === JSON.stringify(init.default) &&
                    !resolvedAtoms[$atomKey]) {
                    resolvedAtoms[$atomKey] = true;
                    return true;
                }
            }
            catch (err) {
                return true;
            }
        })();
        var shouldNotifyOtherSubscribers = typeof defaultAtomsValues[$atomKey] === "function"
            ? true
            : hasChanded || notifyIfValueIsDefault;
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
                if (runEffects || hydrated.current) {
                    for (var _b = 0, effects_1 = effects; _b < effects_1.length; _b++) {
                        var effect = effects_1[_b];
                        var cancelStateUpdate = effect({
                            previous: state,
                            state: newValue,
                            dispatch: updateState,
                            cancel: cancelUpdate,
                        });
                        if (cancelStateUpdate instanceof Promise) {
                            cancelStateUpdate.then(function (r) {
                                if (typeof r !== "undefined" && !r) {
                                    willCancel = true;
                                }
                                else {
                                    if (typeof r === "function") {
                                        atomsEffectsCleanupFunctons[$atomKey].push(r);
                                    }
                                }
                            });
                        }
                        else if (typeof cancelStateUpdate !== "undefined" &&
                            !cancelStateUpdate) {
                            willCancel = true;
                        }
                        else {
                            if (typeof cancelStateUpdate === "function") {
                                atomsEffectsCleanupFunctons[$atomKey].push(cancelStateUpdate);
                            }
                        }
                    }
                }
            }
            catch (err) {
                setRunEffects(true);
            }
            finally {
                if (!willCancel) {
                    defaultAtomsValues[$atomKey] = newValue;
                    try {
                        if (shouldNotifyOtherSubscribers) {
                            if (isActionUpdate) {
                                var tm_1 = setTimeout(function () {
                                    notify($atomKey, hookCall, newValue);
                                    clearTimeout(tm_1);
                                }, 0);
                            }
                            else {
                                notify($atomKey, hookCall, newValue);
                            }
                        }
                    }
                    finally {
                        // Finally update state
                        setState(newValue);
                    }
                }
            }
        }
    }, [hookCall, notify, runEffects, hydrated, state, init.name]);
    (0, react_1.useEffect)(function () {
        function storageListener() {
            return __awaiter(this, void 0, void 0, function () {
                var newState, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof localStorage !== "undefined")) return [3 /*break*/, 5];
                            if (!(typeof localStorage[$atomKey] !== "undefined")) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            if (!(localStorage[$atomKey] !==
                                JSON.stringify(defaultAtomsValues[$atomKey]))) return [3 /*break*/, 3];
                            newState = JSON.parse(localStorage[$atomKey]);
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
                var canListen = typeof window.addEventListener !== "undefined";
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
        return function () { };
    }, [init.name]);
    (0, react_1.useEffect)(function () {
        function loadPersistence() {
            return __awaiter(this, void 0, void 0, function () {
                var tm1_1, tm2_1;
                var _this = this;
                return __generator(this, function (_a) {
                    if (typeof vIfPersistence !== "undefined") {
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
                                            if (JSON.stringify(storageItem) !==
                                                JSON.stringify(defaultAtomsValues[$atomKey])) {
                                                if (!resolvedAtoms[$atomKey]) {
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
                    return [2 /*return*/];
                });
            });
        }
        loadPersistence();
    }, [vIfPersistence, updateState, hydrated]);
    (0, react_1.useEffect)(function () {
        function getPromiseInitialValue() {
            var _a;
            return __awaiter(this, void 0, void 0, function () {
                var v;
                var _this = this;
                return __generator(this, function (_b) {
                    // Only resolve promise if default or resolved value are not present
                    if (typeof defaultAtomsValues[$atomKey] === "undefined") {
                        if (typeof init.default === "function") {
                            if (pendingAtoms[$atomKey] === 0) {
                                pendingAtoms[$atomKey] += 1;
                                v = typeof init.default !== "undefined"
                                    ? (function () { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            return [2 /*return*/, typeof init.default === "function"
                                                    ? init.default()
                                                    : init.default];
                                        });
                                    }); })()
                                    : undefined;
                                if (typeof v !== "undefined") {
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
                                    (_a = atomObservables[$atomKey]) === null || _a === void 0 ? void 0 : _a.notify($atomKey, hookCall, typeof state !== "undefined"
                                        ? state
                                        : defaultAtomsValues[$atomKey]);
                                }
                            }
                        }
                    }
                    return [2 /*return*/];
                });
            });
        }
        getPromiseInitialValue();
    }, [state, init.default, updateState, init.name, hookCall]);
    (0, react_1.useEffect)(function () {
        return function () {
            pendingAtoms[$atomKey] = 0;
        };
    }, [init.name]);
    (0, react_1.useEffect)(function () {
        var handler = function (e) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (e.hookCall !== hookCall) {
                    setState(e.payload);
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
                var windowExists, isBrowserEnv, storageItem, storageItem;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof localStorage !== "undefined")) return [3 /*break*/, 4];
                            windowExists = typeof window !== "undefined";
                            isBrowserEnv = windowExists && "addEventListener" in window;
                            if (!(persistence && (isBrowserEnv ? isLSReady : true))) return [3 /*break*/, 2];
                            return [4 /*yield*/, localStorage.getItem($atomKey)];
                        case 1:
                            storageItem = _a.sent();
                            if (storageItem !== JSON.stringify(defaultAtomsValues[$atomKey])) {
                                localStorage.setItem($atomKey, JSON.stringify(state));
                            }
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, localStorage.getItem($atomKey)];
                        case 3:
                            storageItem = _a.sent();
                            if (typeof storageItem !== "undefined" || storageItem === null) {
                                // Only remove from localStorage if persistence is false
                                if (!persistence) {
                                    localStorage.removeItem($atomKey);
                                }
                            }
                            _a.label = 4;
                        case 4: return [2 /*return*/];
                    }
                });
            });
        }
        updateStorage();
    }, [init.name, persistence, state]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    var actions = (0, react_1.useMemo)(function () { return init.actions || {}; }, []);
    var __actions = (0, react_1.useMemo)(function () {
        return Object.fromEntries(Object.keys(actions).map(function (key) { return [
            key,
            function (args) {
                return actions[key]({
                    args: args,
                    state: state,
                    dispatchSync: updateState,
                    dispatch: function (e) {
                        return updateState(e, true);
                    },
                });
            },
        ]; }));
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]);
    return [state, updateState, __actions];
}
var ignoredAtomKeyWarnings = {};
/**
 * Creates an atom containing state
 */
function atom(init) {
    if (init.ignoreKeyWarning) {
        ignoredAtomKeyWarnings[init.name] = true;
    }
    if (!ignoredAtomKeyWarnings[init.name]) {
        if (init.name in usedKeys) {
            console.warn("Duplicate atom name '".concat(init.name, "' found. This could lead to bugs in atom state. To remove this warning add 'ignoreKeyWarning: true' to all atom definitions that use the name '").concat(init.name, "'."));
        }
    }
    usedKeys[init.name] = true;
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
    var _a = init.name, name = _a === void 0 ? "" : _a, get = init.get;
    var filterDeps = {};
    var $resolving = {};
    var useFilterGet = function () {
        var depsValues = {};
        var readFilters = {};
        useFilterGet["deps"] = {};
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
        }, [prefix, $filterKey]);
        var getObject = (0, react_1.useMemo)(function () { return ({
            get: function (atom) {
                var _a, _b;
                if (typeof atom !== "function") {
                    filterDeps["".concat(prefix, "-")]["".concat(prefix, "-").concat(atom.name)] = true;
                    depsValues["".concat(prefix, "-").concat(atom.name)] =
                        defaultAtomsValues["".concat(prefix, "-").concat(atom.name)];
                    useFilterGet["deps"] = __assign(__assign({}, useFilterGet["deps"]), (_a = {}, _a["".concat(prefix, "-").concat(atom.name)] = true, _a));
                }
                else {
                    filterDeps["".concat(prefix, "-")]["".concat(prefix, "-").concat(atom["atom-name"])] = true;
                    depsValues["".concat(prefix, "-").concat(atom["atom-name"])] =
                        defaultAtomsValues["".concat(prefix, "-").concat(atom["atom-name"])];
                    useFilterGet["deps"] = __assign(__assign({}, useFilterGet["deps"]), (_b = {}, _b["".concat(prefix, "-").concat(atom["atom-name"])] = true, _b));
                }
                return typeof atom !== "function"
                    ? typeof defaultAtomsValues["".concat(prefix, "-").concat(atom.name)] ===
                        "undefined"
                        ? atom.default
                        : defaultAtomsValues["".concat(prefix, "-").concat(atom.name)]
                    : typeof defaultAtomsValues["".concat(prefix, "-").concat(atom["atom-name"])] ===
                        "undefined"
                        ? atom["init-object"].default
                        : defaultAtomsValues["".concat(prefix, "-").concat(atom["atom-name"])];
            },
            read: function ($filter) {
                var _a;
                if (typeof $filter !== "function") {
                    readFilters["".concat(prefix, "-").concat($filter.name)] = true;
                }
                else {
                    // We want any re-renders from filters used to trigger a re-render of the current filter
                    readFilters["".concat(prefix, "-").concat($filter["filter-name"])] = true;
                }
                return typeof $filter !== "function"
                    ? typeof defaultFiltersValues["".concat(prefix, "-").concat($filter.name)] ===
                        "undefined"
                        ? $filter.default
                        : defaultFiltersValues["".concat(prefix, "-").concat($filter.name)]
                    : typeof defaultFiltersValues["".concat(prefix, "-").concat($filter["filter-name"])] === "undefined"
                        ? (_a = $filter["init-object"]) === null || _a === void 0 ? void 0 : _a.default
                        : defaultFiltersValues["".concat(prefix, "-").concat($filter["filter-name"])];
            },
        }); }, [prefix]);
        var hookCall = (0, react_1.useMemo)(function () { return Math.random(); }, []);
        function getInitialValue() {
            var _this = this;
            try {
                return !resolvedFilters[$filterKey]
                    ? (function () {
                        resolvedFilters[$filterKey] = true;
                        defaultFiltersValues[$filterKey] = init.default;
                        var firstResolved;
                        try {
                            firstResolved = get(getObject);
                            if (typeof firstResolved === "undefined") {
                                return init.default;
                            }
                            else {
                                ;
                                (function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a, _b;
                                    return __generator(this, function (_c) {
                                        switch (_c.label) {
                                            case 0:
                                                _a = defaultFiltersValues;
                                                _b = $filterKey;
                                                return [4 /*yield*/, firstResolved];
                                            case 1:
                                                _a[_b] = _c.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })();
                            }
                        }
                        catch (err) {
                        }
                        finally {
                            return firstResolved;
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
        var initialValue = getInitialValue();
        var _a = (0, react_1.useState)(initialValue instanceof Promise || typeof initialValue === "undefined"
            ? init.default
            : (function () {
                defaultFiltersValues[$filterKey] = initialValue;
                return initialValue;
            })()), filterValue = _a[0], setFilterValue = _a[1];
        (0, react_1.useEffect)(function () {
            if (!resolvedFilters[$filterKey]) {
                notifyOtherFilters(hookCall, filterValue);
            }
        }, [filterValue]);
        (0, react_1.useEffect)(function () {
            // Render the first time if initialValue is a promise
            if (initialValue instanceof Promise) {
                initialValue.then(function (initial) {
                    defaultFiltersValues[$filterKey] = initial;
                    setFilterValue(initial);
                });
            }
        }, [initialValue]);
        function renderValue(e) {
            return __awaiter(this, void 0, void 0, function () {
                var tm_2;
                var _this = this;
                return __generator(this, function (_a) {
                    if (typeof e.payload === "function"
                        ? true
                        : JSON.stringify(e.payload) !==
                            JSON.stringify(depsValues[e.storeName])) {
                        if (e.storeName in filterDeps["".concat(prefix, "-")]) {
                            depsValues[e.storeName] = e.payload;
                        }
                        try {
                            if (!$resolving[$filterKey]) {
                                $resolving[$filterKey] = true;
                                tm_2 = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var newValue, _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                if (!(e.storeName in filterDeps["".concat(prefix, "-")] ||
                                                    e.storeName in readFilters)) return [3 /*break*/, 2];
                                                return [4 /*yield*/, get(getObject)];
                                            case 1:
                                                _a = _b.sent();
                                                return [3 /*break*/, 3];
                                            case 2:
                                                _a = defaultFiltersValues[$filterKey];
                                                _b.label = 3;
                                            case 3:
                                                newValue = _a;
                                                defaultFiltersValues[$filterKey] = newValue;
                                                notifyOtherFilters(hookCall, newValue);
                                                setFilterValue(newValue);
                                                $resolving[$filterKey] = false;
                                                clearTimeout(tm_2);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }, 0);
                            }
                        }
                        catch (err) { }
                    }
                    return [2 /*return*/];
                });
            });
        }
        (0, react_1.useEffect)(function () {
            var _a, _b;
            // Whenever the filter object / function changes, add atoms deps again
            if (!subscribedFilters[$filterKey]) {
                subscribedFilters[$filterKey] = true;
                if (defaultFiltersInAtomic[$filterKey]) {
                    get(getObject);
                }
                for (var dep in filterDeps["".concat(prefix, "-")]) {
                    (_a = atomObservables[dep]) === null || _a === void 0 ? void 0 : _a.observer.addListener(dep, renderValue);
                }
                // We subscribe to any re-renders of filters that our current
                // filter is using
                for (var readFilter in readFilters) {
                    (_b = filterObservables[readFilter]) === null || _b === void 0 ? void 0 : _b.observer.addListener(readFilter, renderValue);
                }
                return function () {
                    var _a, _b;
                    defaultFiltersInAtomic[$filterKey] = true;
                    for (var dep in filterDeps["".concat(prefix, "-")]) {
                        (_a = atomObservables[dep]) === null || _a === void 0 ? void 0 : _a.observer.removeListener(dep, renderValue);
                    }
                    for (var readFilter in readFilters) {
                        (_b = filterObservables[readFilter]) === null || _b === void 0 ? void 0 : _b.observer.removeListener(readFilter, renderValue);
                    }
                };
            }
        }, [init, prefix]);
        function updateValueFromObservableChange(e) {
            return __awaiter(this, void 0, void 0, function () {
                var storeName, payload;
                return __generator(this, function (_a) {
                    storeName = e.storeName, payload = e.payload;
                    if (hookCall !== e.hookCall) {
                        setFilterValue(payload);
                    }
                    return [2 /*return*/];
                });
            });
        }
        (0, react_1.useEffect)(function () {
            var _a;
            (_a = filterObserver.observer) === null || _a === void 0 ? void 0 : _a.addListener($filterKey, updateValueFromObservableChange);
            return function () {
                var _a;
                subscribedFilters[$filterKey] = false;
                // resolvedFilters[$filterKey] = false
                (_a = filterObserver === null || filterObserver === void 0 ? void 0 : filterObserver.observer) === null || _a === void 0 ? void 0 : _a.removeListener($filterKey, updateValueFromObservableChange);
            };
        }, [init, prefix]);
        return filterValue;
    };
    useFilterGet["filter-name"] = name;
    useFilterGet["init-object"] = init;
    return useFilterGet;
}
exports.filter = filter;
function useFilter(f) {
    var prefix = (0, react_1.useContext)(atomicStateContext).prefix;
    return (typeof f !== "function"
        ? (function () {
            if (typeof objectFilters["".concat(prefix, "-").concat(f.name)] === "undefined") {
                objectFilters["".concat(prefix, "-").concat(f.name)] = filter(f);
            }
            else {
                if (objectFilters["".concat(prefix, "-").concat(f.name)]["init-object"] !== f) {
                    objectFilters["".concat(prefix, "-").concat(f.name)] = filter(f);
                }
            }
            return objectFilters["".concat(prefix, "-").concat(f.name)]();
        })()
        : f());
}
exports.useFilter = useFilter;
var objectAtoms = {};
/**
 * Get an atom's value and state setter
 */
function useAtom(atom) {
    if (typeof atom !== "function") {
        if (typeof objectAtoms[atom.name] === "undefined") {
            objectAtoms[atom.name] = (0, exports.createAtom)(atom);
        }
        else {
            if (objectAtoms[atom.name]["init-object"] !== atom) {
                objectAtoms[atom.name] = (0, exports.createAtom)(atom);
            }
        }
    }
    return (typeof atom !== "function"
        ? objectAtoms[atom.name]()
        : atom());
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
// Selectors section
// localStorage utilities for web apps
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
                                if (typeof localStorage[k] !== "undefined") {
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
            if (typeof localStorage.setItem === "function") {
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
                    if (typeof localStorage.removeItem === "function") {
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
            if (typeof localStorage.getItem === "function") {
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
            if (JSON.stringify(localStorage[k]) !== JSON.stringify(def)) {
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
