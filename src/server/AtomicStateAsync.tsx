import { PersistenceStoreType } from '../mod'
import { $context } from '../shared'
import { defaultAtomsInAtomic, defaultAtomsValues } from '../store'
import { _isDefined } from '../utils'

export const AtomicStateAsync = async ({
  children,
  default: def,
  value,
  storeName = false,
  persistenceProvider
}: {
  clientOnly?: boolean
  children: any
  /**
   * Set default values using an atom's key
   */
  default?: {
    [key: string]: any
  }
  value?: {
    [key: string]: any
  }
  /**
   * The store name where atoms under the tree will be saved
   */
  storeName?: string | boolean
  /**
   * The persistence provider (optional). It should have the `getItem`, `setItem` and `removeItem` methods.
   *
   * @default localStorage
   */
  persistenceProvider?: PersistenceStoreType
}) => {
  if (def) {
    for (let atomKey in def) {
      const defaultsKey =
        storeName === false ? atomKey : `${storeName}-${atomKey}`

      defaultAtomsValues.set(defaultsKey, await def[atomKey])
      defaultAtomsInAtomic.set(defaultsKey, true)
    }
  }
  if (value) {
    for (let atomKey in value) {
      const defaultsKey =
        storeName === false ? atomKey : `${storeName}-${atomKey}`

      defaultAtomsValues.set(defaultsKey, await value[atomKey])
      defaultAtomsInAtomic.set(defaultsKey, true)
    }
  }

  $context.value = {
    storeName: storeName === '' ? false : storeName,
    ...(persistenceProvider && {
      persistenceProvider
    })
  }

  return children
}
