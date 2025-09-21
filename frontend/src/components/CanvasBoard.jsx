
import React, { useRef, useEffect, useState } from 'react'

export default function CanvasBoard({ token, username }){
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const [ctx, setCtx] = useState(null)
  const [color, setColor] = useState('#000000')
  const [isDrawing, setIsDrawing] = useState(false)
  const [path, setPath] = useState([])

  useEffect(()=>{
    const canvas = document.createElement('canvas')
    canvas.width = 1400; canvas.height = 800; canvas.style.width='100%'; canvas.style.height='100%'
    canvasRef.current = canvas
    const area = document.querySelector('.canvas-area')
    area.appendChild(canvas)
    const c = canvas.getContext('2d')
    c.fillStyle = '#ffffff'; c.fillRect(0,0,canvas.width,canvas.height)
    setCtx(c)

    const wsUrl = ((import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000').replace('http','ws')) + '/ws/global'
    const ws = new WebSocket(wsUrl)
    ws.onopen = ()=>console.log('ws open')
    ws.onmessage = (evt)=>{
      try{
        const data = JSON.parse(evt.data)
        if(data.type === 'draw' && data.payload) drawFromRemote(c, data.payload)
      }catch(e){}
    }
    wsRef.current = ws
    return ()=>{ ws.close(); if(area.contains(canvas)) area.removeChild(canvas) }
  },[])

  function drawFromRemote(c, payload){
    c.beginPath()
    c.strokeStyle = payload.color || 'black'; c.lineWidth = payload.width || 2
    const pts = payload.points || []
    if(pts.length>0){
      c.moveTo(pts[0].x, pts[0].y)
      for(let i=1;i<pts.length;i++) c.lineTo(pts[i].x, pts[i].y)
      c.stroke()
    }
  }

  function sendStroke(pts){
    const ws = wsRef.current
    if(ws && ws.readyState === WebSocket.OPEN){
      ws.send(JSON.stringify({ type:'draw', payload:{ points: pts, color, width: 2, user: username } }))
    }
  }

  function handlePointerDown(e){
    setIsDrawing(true)
    setPath([{ x: e.offsetX * (canvasRef.current.width / canvasRef.current.clientWidth), y: e.offsetY * (canvasRef.current.height / canvasRef.current.clientHeight) }])
  }
  function handlePointerMove(e){
    if(!isDrawing) return
    const pt = { x: e.offsetX * (canvasRef.current.width / canvasRef.current.clientWidth), y: e.offsetY * (canvasRef.current.height / canvasRef.current.clientHeight) }
    setPath(prev=>{
      const next = prev.concat(pt)
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2
      ctx.moveTo(prev[prev.length-1].x, prev[prev.length-1].y); ctx.lineTo(pt.x, pt.y); ctx.stroke()
      return next
    })
  }
  function handlePointerUp(e){
    setIsDrawing(false)
    if(path.length>0){ sendStroke(path); setPath([]) }
  }

  useEffect(()=>{
    const canvas = canvasRef.current
    if(!canvas) return
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return ()=>{
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [ctx, isDrawing, path, color])

  async function handleSave(){
    const dataUrl = canvasRef.current.toDataURL("image/png")
    const payload = { title: `By ${username}`, data_json: JSON.stringify({ png: dataUrl }) }
    try{
      await fetch((import.meta.env.VITE_BACKEND_URL||'http://localhost:8000') + '/api/gallery/', {
        method:'POST',
        headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}: {}) },
        body: JSON.stringify(payload)
      })
      alert('Saved to gallery')
    }catch(e){ alert('Save failed') }
  }

  async function handleAiClean(){
    try{
      const json = JSON.stringify({stub:true})
      const fd = new FormData(); fd.append('data_json', json)
      const res = await fetch((import.meta.env.VITE_BACKEND_URL||'http://localhost:8000') + '/api/ai/cleanup', { method:'POST', body: fd })
      const body = await res.json(); console.log('AI cleaned', body); alert('AI cleanup (stub) complete')
    }catch(e){ console.error(e) }
  }

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',padding:8}}>
        <div style={{display:'flex',gap:8}}>
          <input className='color-input' type='color' value={color} onChange={e=>setColor(e.target.value)}/>
          <button className='btn' onClick={()=>{ if(ctx) ctx.clearRect(0,0,canvasRef.current.width,canvasRef.current.height) }}>Clear</button>
          <button className='btn' onClick={handleSave}>Save</button>
          <button className='btn' onClick={handleAiClean}>AI Clean</button>
        </div>
        <div className='small'>Connected: global</div>
      </div>
      <div style={{flex:1}}></div>
    </div>
  )
}
