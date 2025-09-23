import React, {useState} from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Tooltip from './components/Tooltip'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Guest')

  const onLogin = (token, user)=>{ setToken(token); setUsername(user); localStorage.setItem('token', token); localStorage.setItem('username', user) }
  const onLogout = ()=>{ setToken(null); setUsername('Guest'); localStorage.removeItem('token'); localStorage.removeItem('username') }

  return (
    <div className="app">
      <div className="header">
        <div className="brand">AI Whiteboard</div>
        <div className="small">Signed in: <strong>{username}</strong></div>
      </div>
      <Tooltip/>
      {!token ? <Login onLogin={onLogin}/> : <Dashboard token={token} username={username} onLogout={onLogout}/>}
    </div>
  )
}
