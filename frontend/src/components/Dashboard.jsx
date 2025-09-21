
import React from 'react'
import Toolbar from './Toolbar'
import CanvasBoard from './CanvasBoard'
import Gallery from './Gallery'

export default function Dashboard({ token, username, onLogout }){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button className='btn' onClick={onLogout}>Logout</button>
      </div>
      <div className='workspace'>
        <div className='toolbar'><Toolbar/></div>
        <div className='board-wrap'>
          <div className='board'>
            <div style={{padding:8,display:'flex',justifyContent:'space-between',borderBottom:'1px solid #e6eef822'}}>
              <div className='small'>Room: global</div>
              <div className='small'>Tools: Pen • Shapes • Graphs • Gallery • AI Clean</div>
            </div>
            <div className='canvas-area'>
              <CanvasBoard token={token} username={username}/>
            </div>
          </div>
        </div>
        <div className='right-panel'><Gallery token={token}/></div>
      </div>
    </div>
  )
}
