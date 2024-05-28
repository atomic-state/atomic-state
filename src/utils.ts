export function _isDefined(target: any) {
  return typeof target !== 'undefined'
}

export function _isFunction(target: any) {
  return typeof target === 'function'
}

export function _isPromise(target: any) {
  return target instanceof Promise
}

export function jsonEquality(target1: any, target2: any) {
  return JSON.stringify(target1) === JSON.stringify(target2)
}
