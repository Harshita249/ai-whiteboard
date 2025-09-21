
import React, {useEffect, useState} from 'react'
export default function Gallery(){
  const [items,setItems]=useState([])
  useEffect(()=>{ fetchGallery() },[])
  async function fetchGallery(){
    try{
      const res = await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + '/api/gallery/')
      const data = await res.json(); setItems(data)
    }catch(e){ console.error(e) }
  }
  return (
    <div>
      <h4 style={{color:'#6ee7b7'}}>Gallery</h4>
      {items.map(it=>(
        <div key={it.id} style={{background:'rgba(255,255,255,0.01)',borderRadius:8,padding:8,marginTop:8}}>
          <div className='small'>{it.title}</div>
          {it.data_json && (()=>{ try{const parsed=JSON.parse(it.data_json); if(parsed.png) return <img src={parsed.png} style={{width:'100%',borderRadius:6,marginTop:6}}/> }catch(e){return null}})()}
        </div>
      ))}
    </div>
  )
}
