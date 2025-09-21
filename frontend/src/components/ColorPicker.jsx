
import React from 'react'
export default function ColorPicker({value='#000000', onChange=()=>{}}){
  return <input aria-label='color' className='color-input' type='color' defaultValue={value} onChange={e=>onChange(e.target.value)} />
}
