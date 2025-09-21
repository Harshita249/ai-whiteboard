
import React from 'react'
import ColorPicker from './ColorPicker'
import ShapesPanel from './ShapesPanel'

export default function Toolbar(){
  return (
    <>
      <button className='btn' title='Pen'>✏️</button>
      <button className='btn' title='Eraser'>🧽</button>
      <button className='btn' title='Select'>🔲</button>
      <ShapesPanel/>
      <div style={{padding:6}}><ColorPicker/></div>
      <button className='btn' title='Undo'>↶</button>
      <button className='btn' title='Redo'>↷</button>
    </>
  )
}
