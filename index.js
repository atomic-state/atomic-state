"use strict";
/**  @license Atomic State
 * Copyright (c) Dany Beltran
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
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
exports.useStorageItem = exports.storage = exports.useStorage = exports.useAtomActions = exports.useActions = exports.useAtomDispatch = exports.useDispatch = exports.useAtomValue = exports.useValue = exports.useAtom = exports.useFilter = exports.filter = exports.createAtom = exports.atom = exports.AtomicState = void 0;
var events_1 = require("events");
var react_1 = require("react");
var is18 = parseInt(react_1.version.split(".")[0]) >= 18;
var atomEmitters = {};
function createEmitter() {
    var emitter = new events_1.EventEmitter();
    emitter.setMaxListeners(10e12);
    function notify(storeName, hookCall, payload) {
        if (payload === void 0) { payload = {}; }
        emitter.emit(storeName, { storeName: storeName, hookCall: hookCall, payload: payload });
    }
    return {
        emitter: emitter,
        notify: notify,
    };
}
var defaultAtomsValues = {};
var defaultAtomsInAtomic = {};
var defaultFiltersInAtomic = {};
var usedKeys = {};
var pendingAtoms = {};
var AtomicState = function (_a) {
    var children = _a.children, atoms = _a.atoms, filters = _a.filters;
    if (atoms) {
        for (var atomKey in atoms) {
            defaultAtomsValues[atomKey] = atoms[atomKey];
            defaultAtomsInAtomic[atomKey] = true;
        }
    }
    if (filters) {
        for (var filterKey in filters) {
            defaultFiltersValues[filterKey] = filters[filterKey];
            defaultFiltersInAtomic[filterKey] = true;
        }
    }
    return children;
};
exports.AtomicState = AtomicState;
function useAtomCreate(init) {
    var _this = this;
    var _a = init.effects, effects = _a === void 0 ? [] : _a, persist = init.persist, localStoragePersistence = init.localStoragePersistence, _b = init.sync, sync = _b === void 0 ? true : _b, _c = init.onSync, onSync = _c === void 0 ? function () { } : _c;
    var _d = (0, react_1.useState)(false), isLSReady = _d[0], setIsLSReady = _d[1];
    var persistence = localStoragePersistence || persist;
    var hydration = true;
    var hookCall = (0, react_1.useMemo)(function () { return "".concat(Math.random()).split(".")[1]; }, []);
    var isDefined = typeof init.default !== "undefined";
    var initialValue = (function getInitialValue() {
        var isFunction = typeof defaultAtomsValues[init.name] === "undefined" &&
            typeof init.default === "function";
        var initialIfFnOrPromise = isFunction
            ? init.default()
            : init.default instanceof Promise
                ? init.default
                : undefined;
        var isPromiseValue = initialIfFnOrPromise instanceof Promise;
        var initVal = isDefined
            ? typeof defaultAtomsValues[init.name] === "undefined"
                ? !isPromiseValue
                    ? typeof initialIfFnOrPromise !== "undefined"
                        ? initialIfFnOrPromise
                        : init.default
                    : init.default
                : defaultAtomsValues[init.name]
            : defaultAtomsValues[init.name];
        try {
            if (persistence) {
                if (typeof localStorage !== "undefined") {
                    if (typeof defaultAtomsValues[init.name] === "undefined" ||
                        defaultAtomsInAtomic[init.name]) {
                        defaultAtomsInAtomic[init.name] = false;
                        defaultAtomsValues[init.name] = isPromiseValue
                            ? undefined
                            : hydration
                                ? initVal
                                : JSON.parse(localStorage["store-".concat(init.name)]);
                    }
                }
            }
            else {
                if (typeof defaultAtomsValues[init.name] === "undefined") {
                    defaultAtomsValues[init.name] = initVal;
                }
            }
            return persistence
                ? typeof localStorage !== "undefined"
                    ? typeof localStorage["store-".concat(init.name)] !== "undefined"
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
                    : initVal;
        }
        catch (err) {
            return initVal;
        }
    })();
    var _e = (0, react_1.useState)(function () {
        try {
            if (hydration) {
                return JSON.parse(localStorage["store-".concat(init.name)]);
            }
            else
                return undefined;
        }
        catch (err) {
            return initialValue;
        }
    }), vIfPersistence = _e[0], setVIfPersistence = _e[1];
    (0, react_1.useEffect)(function () {
        function storageListener() {
            return __awaiter(this, void 0, void 0, function () {
                var newState, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof localStorage !== "undefined")) return [3 /*break*/, 5];
                            if (!(typeof localStorage["store-".concat(init.name)] !== "undefined")) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            if (!(localStorage["store-".concat(init.name)] !==
                                JSON.stringify(defaultAtomsValues[init.name]))) return [3 /*break*/, 3];
                            newState = JSON.parse(localStorage["store-".concat(init.name)]);
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
    var _f = (0, react_1.useState)((initialValue instanceof Promise || typeof initialValue === "function") &&
        typeof defaultAtomsValues[init.name] === "undefined"
        ? undefined
        : (function () {
            defaultAtomsValues[init.name] = initialValue;
            return initialValue;
        })()), state = _f[0], setState = _f[1];
    if (!pendingAtoms[init.name]) {
        pendingAtoms[init.name] = 0;
    }
    if (!atomEmitters[init.name]) {
        atomEmitters[init.name] = createEmitter();
    }
    var _g = atomEmitters[init.name], emitter = _g.emitter, notify = _g.notify;
    var _h = (0, react_1.useState)(false), runEffects = _h[0], setRunEffects = _h[1];
    var hydrated = (0, react_1.useRef)(false);
    var updateState = (0, react_1.useCallback)(function (v) { return __awaiter(_this, void 0, void 0, function () {
        var willCancel, newValue, _a, _i, effects_1, effect, cancelStateUpdate, err_2, tm_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    willCancel = false;
                    if (!(typeof v === "function")) return [3 /*break*/, 2];
                    return [4 /*yield*/, v(state)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = v;
                    _b.label = 3;
                case 3:
                    newValue = _a;
                    defaultAtomsValues[init.name] = newValue;
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 9, 10, 11]);
                    if (!(runEffects || hydrated.current)) return [3 /*break*/, 8];
                    _i = 0, effects_1 = effects;
                    _b.label = 5;
                case 5:
                    if (!(_i < effects_1.length)) return [3 /*break*/, 8];
                    effect = effects_1[_i];
                    return [4 /*yield*/, effect({
                            previous: state,
                            state: newValue,
                            dispatch: updateState,
                        })];
                case 6:
                    cancelStateUpdate = (_b.sent());
                    if (typeof cancelStateUpdate !== "undefined" &&
                        !cancelStateUpdate) {
                        willCancel = true;
                    }
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8: return [3 /*break*/, 11];
                case 9:
                    err_2 = _b.sent();
                    setRunEffects(true);
                    return [3 /*break*/, 11];
                case 10:
                    if (!willCancel) {
                        if (is18) {
                            notify(init.name, hookCall, newValue);
                            // Finally update state
                            setState(newValue);
                        }
                        else {
                            tm_1 = setTimeout(function () {
                                notify(init.name, hookCall, newValue);
                                // Finally update state
                                setState(newValue);
                                clearTimeout(tm_1);
                            }, 0);
                        }
                    }
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    }); }, [hookCall, notify, runEffects, hydrated, state, init.name]);
    (0, react_1.useEffect)(function () {
        if (typeof vIfPersistence !== "undefined") {
            if (!hydrated.current) {
                var tm1_1 = setTimeout(function () {
                    updateState(vIfPersistence);
                    setIsLSReady(true);
                }, 0);
                var tm2_1 = setTimeout(function () {
                    setVIfPersistence(undefined);
                    hydrated.current = true;
                }, 0);
                return function () {
                    clearTimeout(tm1_1);
                    clearTimeout(tm2_1);
                };
            }
        }
    }, [vIfPersistence, updateState, hydrated]);
    (0, react_1.useEffect)(function () {
        function getPromiseInitialValue() {
            return __awaiter(this, void 0, void 0, function () {
                var v;
                var _this = this;
                return __generator(this, function (_a) {
                    // Only resolve promise if default or resolved value are not present
                    if (typeof defaultAtomsValues[init.name] === "undefined") {
                        if (typeof init.default === "function") {
                            if (pendingAtoms[init.name] === 0) {
                                pendingAtoms[init.name] += 1;
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
                                        defaultAtomsValues[init.name] = val;
                                        updateState(val);
                                    });
                                }
                            }
                            else {
                                pendingAtoms[init.name] += 1;
                                if (state || defaultAtomsValues[init.name]) {
                                    atomEmitters[init.name].notify(init.name, hookCall, state || defaultAtomsValues[init.name]);
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
            pendingAtoms[init.name] = 0;
        };
    }, [init.name]);
    (0, react_1.useEffect)(function () {
        var handler = function (e) { return __awaiter(_this, void 0, void 0, function () {
            var tm_2;
            return __generator(this, function (_a) {
                if (e.hookCall !== hookCall) {
                    tm_2 = setTimeout(function () {
                        setState(e.payload);
                        clearTimeout(tm_2);
                    }, 0);
                }
                return [2 /*return*/];
            });
        }); };
        emitter.addListener(init.name, handler);
        return function () {
            emitter.removeListener(init.name, handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runEffects]);
    (0, react_1.useEffect)(function () {
        if (typeof localStorage !== "undefined") {
            if (persistence && isLSReady) {
                if (localStorage["store-".concat(init.name)] !== defaultAtomsValues[init.name]) {
                    localStorage.setItem("store-".concat(init.name), JSON.stringify(state));
                }
            }
            else {
                if (typeof localStorage["store-".concat(init.name)] !== "undefined") {
                    localStorage.removeItem("store-".concat(init.name));
                }
            }
        }
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
                    dispatch: updateState,
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
var defaultFiltersValues = {};
var objectFilters = {};
var resolvedFilters = {};
function filter(init) {
    var name = init.name, get = init.get;
    var filterDeps = {};
    var depsValues = {};
    var getObject = {
        get: function (atom) {
            if (typeof atom !== "function") {
                filterDeps[atom.name] = true;
                depsValues[atom.name] = defaultAtomsValues[atom.name];
            }
            else {
                filterDeps[atom["atom-name"]] = true;
                depsValues[atom["atom-name"]] = defaultAtomsValues[atom["atom-name"]];
            }
            return typeof atom !== "function"
                ? defaultAtomsValues[atom.name]
                : defaultAtomsValues[atom["atom-name"]];
        },
    };
    var useFilterGet = function () {
        function getInitialValue() {
            try {
                return typeof defaultFiltersValues["".concat(name)] === "undefined"
                    ? (function () {
                        return get(getObject);
                    })()
                    : (function () {
                        return defaultFiltersValues["".concat(name)];
                    })();
            }
            catch (err) {
                return init.default;
            }
        }
        var initialValue = getInitialValue();
        (0, react_1.useEffect)(function () {
            // Whenever the filter object / function changes, add atoms deps again
            get(getObject);
        }, [init]);
        (0, react_1.useEffect)(function () {
            // Only render when using top `AtomicState` to set default filter value
            // This prevents rendering the filter twice in the first render
            if (defaultFiltersInAtomic["".concat(name)]) {
                get(getObject);
            }
        }, []);
        var _a = (0, react_1.useState)(initialValue instanceof Promise || typeof initialValue === "undefined"
            ? undefined
            : (function () {
                defaultFiltersValues["".concat(name)] = initialValue;
                return initialValue;
            })()), filterValue = _a[0], setFilterValue = _a[1];
        (0, react_1.useEffect)(function () {
            // Render the first time if initialValue is a promise
            if (initialValue instanceof Promise) {
                initialValue.then(function (initial) {
                    defaultFiltersValues["".concat(name)] = initial;
                    setFilterValue(initial);
                });
            }
        }, [initialValue]);
        function renderValue(e) {
            if (typeof e.payload === "function"
                ? true
                : JSON.stringify(depsValues[e.storeName]) !==
                    JSON.stringify(defaultAtomsValues[e.storeName])) {
                var tm_3 = setTimeout(function () {
                    var newValue = get(getObject);
                    if (newValue instanceof Promise) {
                        newValue.then(function (v) {
                            defaultFiltersValues["".concat(name)] = newValue;
                            setFilterValue(v);
                        });
                    }
                    else {
                        defaultFiltersValues["".concat(name)] = newValue;
                        setFilterValue(newValue);
                    }
                    clearTimeout(tm_3);
                }, 0);
            }
        }
        (0, react_1.useEffect)(function () {
            // This renders the initial value of the filter if it was set
            // using the `AtomicState` component
            if (defaultFiltersInAtomic["".concat(name)]) {
                defaultFiltersInAtomic["".concat(name)] = false;
                renderValue({});
            }
        }, []);
        (0, react_1.useEffect)(function () {
            var _a;
            for (var dep in filterDeps) {
                (_a = atomEmitters[dep]) === null || _a === void 0 ? void 0 : _a.emitter.addListener(dep, renderValue);
            }
            return function () {
                var _a;
                for (var dep in filterDeps) {
                    (_a = atomEmitters[dep]) === null || _a === void 0 ? void 0 : _a.emitter.removeListener(dep, renderValue);
                }
            };
        }, []);
        return filterValue;
    };
    useFilterGet["filter-name"] = name;
    useFilterGet["init-object"] = init;
    return useFilterGet;
}
exports.filter = filter;
function useFilter(f) {
    return (typeof f !== "function"
        ? (function () {
            if (typeof objectFilters["".concat(f.name)] === "undefined") {
                objectFilters["".concat(f.name)] = filter(f);
            }
            else {
                if (objectFilters["".concat(f.name)]["init-object"] !== f) {
                    objectFilters["".concat(f.name)] = filter(f);
                }
            }
            return objectFilters["".concat(f.name)]();
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
var storageEmitter = (function () {
    var emm = new events_1.EventEmitter();
    emm.setMaxListeners(Math.pow(10, 10));
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
        storageEmitter.addListener("store-changed", updateStore);
        return function () {
            storageEmitter.removeListener("store-changed", updateStore);
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
                storageEmitter.emit("store-changed", v);
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
                        storageEmitter.emit("store-changed", {});
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
    var itemListener = function () {
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
        itemListener();
        storageEmitter.addListener("store-changed", itemListener);
        return function () {
            storageEmitter.removeListener("store-changed", itemListener);
        };
    }, []);
    return value;
}
exports.useStorageItem = useStorageItem;
