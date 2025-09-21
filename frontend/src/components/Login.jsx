
import React, {useState} from 'react'
import { login, register } from '../api'

export default function Login({ onLogin }){
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const [mode,setMode]=useState('login')
  const [err,setErr]=useState(null)

  async function submit(e){
    e.preventDefault()
    try{
      if(mode==='register') await register(username,password)
      const res = await login(username,password)
      onLogin(res.data.access_token, username)
    }catch(e){ setErr(e?.response?.data || e.message) }
  }

  return (
    <div style={{display:'flex',justifyContent:'center',padding:12}}>
      <form onSubmit={submit} style={{width:420,background:'rgba(255,255,255,0.02)',padding:16,borderRadius:8}}>
        <h3 style={{color:'#6ee7b7'}}>{mode==='login' ? 'Sign in' : 'Register'}</h3>
        <input placeholder='username' value={username} onChange={e=>setUsername(e.target.value)} style={{width:'100%',padding:8,marginTop:8,borderRadius:6}}/>
        <input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:8,marginTop:8,borderRadius:6}}/>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}>
          <button className='btn' type='submit' style={{background:'#052b21',padding:'8px 12px',borderRadius:8}}>{mode==='login' ? 'Login' : 'Register'}</button>
          <button type='button' className='btn' onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login' ? 'Create account' : 'Have an account?'}</button>
        </div>
        {err && <div style={{color:'tomato',marginTop:8}}>{String(err)}</div>}
      </form>
    </div>
  )
}
