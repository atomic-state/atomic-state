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
exports.storage = exports.useStorage = exports.useAtomActions = exports.useActions = exports.useAtomDispatch = exports.useDispatch = exports.useAtomValue = exports.useValue = exports.useAtom = exports.createAtom = exports.atom = void 0;
var events_1 = require("events");
var react_1 = require("react");
var atomEmitters = {};
function createEmitter() {
    var emitter = new events_1.EventEmitter();
    emitter.setMaxListeners(10e12);
    function notify(storeName, hookCall, payload) {
        if (payload === void 0) { payload = {}; }
        emitter.emit(storeName, { hookCall: hookCall, payload: payload });
    }
    return {
        emitter: emitter,
        notify: notify,
    };
}
function useAtomCreate(init) {
    var _this = this;
    var hookCall = (0, react_1.useMemo)(function () { return ("" + Math.random()).split(".")[1]; }, []);
    var initialValue = (function getInitialValue() {
        return init.localStoragePersistence
            ? typeof localStorage !== "undefined"
                ? typeof localStorage["store-" + init.name] !== "undefined"
                    ? JSON.parse(localStorage["store-" + init.name])
                    : init.default
                : init.default
            : init.default;
    })();
    var _a = (0, react_1.useState)(initialValue), state = _a[0], setState = _a[1];
    if (!atomEmitters[init.name]) {
        atomEmitters[init.name] = createEmitter();
    }
    var _b = atomEmitters[init.name], emitter = _b.emitter, notify = _b.notify;
    (0, react_1.useEffect)(function () {
        var handler = function (e) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (e.hookCall !== hookCall) {
                    setState(e.payload);
                }
                return [2 /*return*/];
            });
        }); };
        emitter.addListener(init.name, handler);
        return function () {
            emitter.removeListener(init.name, handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var updateState = function (v) {
        // First notify other subscribers
        notify(init.name, hookCall, v);
        // Finally update state
        setState(v);
    };
    (0, react_1.useEffect)(function () {
        if (typeof localStorage !== "undefined") {
            if (init.localStoragePersistence) {
                localStorage["store-" + init.name] = JSON.stringify(state);
            }
            else {
                if (typeof localStorage["store-" + init.name] !== "undefined") {
                    localStorage.removeItem("store-" + init.name);
                }
            }
        }
    }, [init.name, init.localStoragePersistence, state]);
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
    return [
        state,
        updateState,
        __actions,
    ];
}
/**
 * Creates an atom containing state
 */
function atom(init) {
    return function () { return useAtomCreate(init); };
}
exports.atom = atom;
exports.createAtom = atom;
/**
 * Get an atom's value and state setter
 */
function useAtom(atom) {
    return atom();
}
exports.useAtom = useAtom;
/**
 * Get an atom's value
 */
function useValue(atom) {
    return atom()[0];
}
exports.useValue = useValue;
exports.useAtomValue = useValue;
/**
 * Get the function that updates the atom's value
 */
function useDispatch(atom) {
    return atom()[1];
}
exports.useDispatch = useDispatch;
exports.useAtomDispatch = useDispatch;
/**
 * Get the actions of the atom as reducers
 */
function useActions(atom) {
    return atom()[2];
}
exports.useActions = useActions;
exports.useAtomActions = useActions;
// localStorage utilities for web apps
var storageEmitter = (function () {
    var emm = new events_1.EventEmitter();
    emm.setMaxListeners(Math.pow(10, 10));
    return emm;
})();
function useStorage() {
    var _a = (0, react_1.useState)({}), keys = _a[0], setKeys = _a[1];
    function updateStore() {
        return __awaiter(this, void 0, void 0, function () {
            var $keys, k;
            return __generator(this, function (_a) {
                $keys = {};
                if (typeof localStorage !== "undefined") {
                    for (k in localStorage) {
                        if (!k.match(/clear|getItem|key|length|removeItem|setItem/)) {
                            try {
                                $keys[k] = JSON.parse(localStorage[k]);
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
            storageEmitter.removeListener("store-changes", updateStore);
        };
    }, []);
    return keys;
}
exports.useStorage = useStorage;
exports.storage = {
    set: function (k, v) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof localStorage !== "undefined") {
                    localStorage[k] = JSON.stringify(v);
                    storageEmitter.emit("store-changed", v);
                }
                return [2 /*return*/];
            });
        });
    },
    remove: function (k) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof localStorage !== "undefined") {
                    localStorage.removeItem(k);
                    storageEmitter.emit("store-changed", {});
                }
                return [2 /*return*/];
            });
        });
    },
    get: function (k) {
        if (typeof localStorage !== "undefined") {
            try {
                return JSON.parse(localStorage[k]);
            }
            catch (err) {
                return "";
            }
        }
    },
};
//# sourceMappingURL=index.js.map