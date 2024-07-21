export function _isDefined(target: any) {
  return typeof target !== 'undefined'
}

export function _isFunction(target: any) {
  return typeof target === 'function'
}

export function _isPromise(target: any) {
  return target instanceof Promise
}

export function jsonEquality(a: any, b: any) {
  // Just parse arrays
  if (Array.isArray(a)) {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  try {
    const bProps = Object.keys(b)

    let aMock: any = {
      ...a
    }

    // Making sure keys are in the same order
    for (let prop of bProps) {
      aMock[prop] = undefined
      aMock[prop] = a[prop]
    }

    return JSON.stringify(aMock) === JSON.stringify(b)
  } catch {
    return false
  }
}
