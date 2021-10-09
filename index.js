"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDispatch = exports.useValue = exports.useActions = exports.atom = exports.useAtomActions = exports.useAtomDispatch = exports.useAtomValue = exports.useAtom = exports.createAtom = void 0;
/* eslint-disable react-hooks/exhaustive-deps */
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
function useGlobalState(initialValue, storeName, persist, actions) {
    if (storeName === void 0) { storeName = ""; }
    if (persist === void 0) { persist = false; }
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
    var updateStore = function (update) {
        setStore(function (c) {
            var newValue = typeof update === "function" ? update(c) : update;
            notify(storeName, hookCall, newValue);
            if (persist && typeof localStorage !== "undefined") {
                localStorage["store-" + storeName] = JSON.stringify(newValue);
            }
            return newValue;
        });
    };
    (0, react_1.useEffect)(function () {
        var stateListener = function (e) {
            if (e.hookCall !== hookCall) {
                setStore(e.payload);
            }
        };
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
    return [store, set, __actions];
}
function createAtom(init) {
    return function () {
        return useGlobalState(init.default, init.name, init.localStoragePersistence, init.actions);
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