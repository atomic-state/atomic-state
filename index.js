"use strict";
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
exports.useDispatch = exports.useValue = exports.useActions = exports.atom = exports.useAtomActions = exports.useAtomDispatch = exports.useAtomValue = exports.useAtom = exports.createAtom = void 0;
/*  eslint-disable react-hooks/exhaustive-deps*/
var react_1 = require("react");
var events_1 = require("events");
function createEmitter() {
    var emitter = new events_1.EventEmitter();
    emitter.setMaxListeners(10e12);
    function notify(storeName, hookCall, payload) {
        if (payload === void 0) { payload = {}; }
        emitter.emit(storeName, { hookCall: hookCall, payload: payload });
    }
    return {
        Aesthetic: emitter,
        notify: notify,
    };
}
/**
 * Contains an event emitter for each store using the store name
 */
var emitters = {};
function useGlobalState(initialValue, storeName, persist, get, actions) {
    var _this = this;
    if (storeName === void 0) { storeName = ""; }
    if (persist === void 0) { persist = false; }
    if (get === void 0) { get = function (value) { return value; }; }
    if (actions === void 0) { actions = {}; }
    if (!emitters[storeName]) {
        emitters[storeName] = createEmitter();
    }
    var _a = emitters[storeName], Aesthetic = _a.Aesthetic, notify = _a.notify;
    if (typeof localStorage !== "undefined") {
        if (!localStorage["store-" + storeName] && persist) {
            localStorage["store-" + storeName] = JSON.stringify(initialValue);
        }
    }
    var hookCall = (0, react_1.useMemo)(function () { return ("" + Math.random()).split(".")[1]; }, []);
    var _b = (0, react_1.useState)(persist && typeof localStorage !== "undefined"
        ? JSON.parse(localStorage["store-" + storeName])
        : initialValue), store = _b[0], setStore = _b[1];
    var _c = (0, react_1.useState)(), storeGetter = _c[0], setStoreGetter = _c[1];
    var val = (0, react_1.useRef)(store);
    var updateStore = function (update) {
        setStore(function (c) {
            var newValue = typeof update === "function" ? update(c) : update;
            if (persist && typeof localStorage !== "undefined") {
                localStorage["store-" + storeName] = JSON.stringify(newValue);
            }
            val.current = newValue;
            return newValue;
        });
    };
    (0, react_1.useEffect)(function () {
        notify(storeName, hookCall, val === null || val === void 0 ? void 0 : val.current);
    }, [val.current]);
    (0, react_1.useEffect)(function () {
        var stateListener = function (e) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (e.hookCall !== hookCall) {
                    setStore(e.payload);
                }
                return [2 /*return*/];
            });
        }); };
        Aesthetic.addListener(storeName, stateListener);
        return function () {
            Aesthetic.removeListener(storeName, stateListener);
        };
    }, [store, hookCall, storeName]);
    var set = (0, react_1.useMemo)(function () { return function (value) {
        updateStore(value);
    }; }, [store]);
    var __actions = (0, react_1.useMemo)(function () {
        return Object.fromEntries(Object.keys(actions).map(function (key) { return [
            key,
            function (args) {
                return actions[key]({
                    args: args,
                    state: store,
                    dispatch: set,
                });
            },
        ]; }));
    }, [store]);
    var resolverStorePromise = (0, react_1.useMemo)(function () {
        return function () {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, get(store)];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
    }, [store]);
    (0, react_1.useEffect)(function () {
        resolverStorePromise()
            .then(function (res) {
            setStoreGetter(res);
        })
            .catch(function (er) {
            throw er;
        });
    }, [store, hookCall]);
    return [storeGetter, set, __actions];
}
function createAtom(init) {
    return function () {
        return useGlobalState(init.default, init.name || JSON.stringify(init.default), init.localStoragePersistence, init.get, init.actions);
    };
}
exports.createAtom = createAtom;
function useAtom(atom) {
    return atom();
}
exports.useAtom = useAtom;
function useAtomValue(atom) {
    var value = useAtom(atom)[0];
    return value;
}
exports.useAtomValue = useAtomValue;
function useAtomDispatch(atom) {
    var _a = useAtom(atom), dispatch = _a[1];
    return dispatch;
}
exports.useAtomDispatch = useAtomDispatch;
function useAtomActions(atom) {
    var _a = useAtom(atom), actions = _a[2];
    return actions;
}
exports.useAtomActions = useAtomActions;
exports.atom = createAtom;
exports.useActions = useAtomActions;
exports.useValue = useAtomValue;
exports.useDispatch = useAtomDispatch;
//# sourceMappingURL=index.js.map