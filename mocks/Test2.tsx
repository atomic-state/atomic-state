import React from 'react'
import { useAtom } from '../'
import { nameState } from './atoms'

export const NameDisplay = () => {
  const [name] = useAtom(nameState)
  return <p>Username: {name}</p>
}

export const NameField = () => {
  const [name, setName] = useAtom(nameState)
  return (
    <div>
      <input
        title='name field'
        type='text'
        value={name}
        onChange={e => setName(e.target.value)}
      />
    </div>
  )
}
