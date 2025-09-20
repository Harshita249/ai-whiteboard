import React, {useRef, useEffect, useState} from "react";
import { fabric } from "fabric";
import Toolbar from "./Toolbar";

const WS_BASE = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/^http/, 'ws');

export default function Whiteboard(){
  const fabricRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#222222");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [roomId] = useState("default-room");
  const wsRef = useRef(null);

  useEffect(() => {
    const c = new fabric.Canvas('board', { backgroundColor: "#fff", preserveObjectStacking:true });
    c.setWidth(Math.min(window.innerWidth-40, 1000));
    c.setHeight(Math.min(window.innerHeight-180, 700));
    fabricRef.current = c;

    c.freeDrawingBrush.width = strokeWidth;
    c.freeDrawingBrush.color = color;
    c.isDrawingMode = true;

    c.on('path:created', (opt) => {
      const obj = opt.path.toObject(['path','stroke','strokeWidth','fill']);
      sendMessage({type:'path:created', object: obj});
    });

    c.on('object:added', (opt) => {
      if (opt.target && opt.target.__own) return;
      const obj = opt.target.toObject();
      sendMessage({type:'object:added', object: obj});
    });

    wsRef.current = new WebSocket(`${WS_BASE}/ws/${roomId}`);
    wsRef.current.onopen = ()=>console.log("WS open");
    wsRef.current.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleRemoteMessage(msg);
      } catch(e){ console.error(e); }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      wsRef.current && wsRef.current.close();
      c.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(()=>{
    if (!fabricRef.current) return;
    if (tool === 'pen') {
      fabricRef.current.isDrawingMode = true;
      fabricRef.current.freeDrawingBrush.width = strokeWidth;
      fabricRef.current.freeDrawingBrush.color = color;
    } else {
      fabricRef.current.isDrawingMode = false;
    }
  }, [tool, color, strokeWidth]);

  function handleResize(){
    const c = fabricRef.current;
    if(!c) return;
    const newW = Math.min(window.innerWidth-40, 1000);
    const newH = Math.min(window.innerHeight-180, 700);
    c.setWidth(newW);
    c.setHeight(newH);
    c.renderAll();
  }

  function sendMessage(message) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }

  async function handleRemoteMessage(msg){
    const c = fabricRef.current;
    if (!c) return;
    if (msg.type === 'object:added') {
      fabric.util.enlivenObjects([msg.object], function(objects) {
        objects.forEach(o => { o.__own = true; c.add(o); });
        c.renderAll();
      });
    } else if (msg.type === 'path:created') {
      const o = new fabric.Path(msg.object.path, {
        stroke: msg.object.stroke || '#000',
        strokeWidth: msg.object.strokeWidth || 2,
        fill: msg.object.fill || ''
      });
      o.__own = true;
      c.add(o);
      c.renderAll();
    }
  }

  async function addShapeOfType(type){
    const c = fabricRef.current;
    if(type === 'rect') {
      const rect = new fabric.Rect({ left: 50, top:50, width: 200, height:120, fill: 'rgba(0,0,0,0)', stroke: color, strokeWidth });
      c.add(rect);
      sendMessage({type:'object:added', object: rect.toObject()});
    } else if (type === 'ellipse') {
      const el = new fabric.Ellipse({ left: 80, top:80, rx:80, ry:40, fill:'rgba(0,0,0,0)', stroke: color, strokeWidth });
      c.add(el);
      sendMessage({type:'object:added', object: el.toObject()});
    } else if (type === 'text') {
      const t = new fabric.Textbox('Text', { left:120, top:120, fontSize:18, fill: color });
      c.add(t);
      sendMessage({type:'object:added', object: t.toObject()});
    } else if (type === 'arrow') {
      const line = new fabric.Line([10,10,210,10], { left: 100, top:100, stroke: color, strokeWidth });
      const tri = new fabric.Triangle({ left: 210, top: 8, width: 12, height: 20, fill: color });
      c.add(line, tri);
      sendMessage({type:'object:added', object: line.toObject()});
      sendMessage({type:'object:added', object: tri.toObject()});
    }
  }

  async function doAIClean(){
    const c = fabricRef.current;
    const dataUrl = c.toDataURL({format:'png', multiplier:1});
    const blob = await (await fetch(dataUrl)).blob();
    const fd = new FormData();
    fd.append('file', blob, 'capture.png');
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/ai/clean`, { method: "POST", body: fd });
    const json = await res.json();
    if (json.success && json.shapes) {
      json.shapes.forEach(s => {
        if (s.type === 'rect') {
          const r = new fabric.Rect({ left: s.left, top: s.top, width: s.width, height: s.height, fill: s.fill || 'rgba(0,0,0,0)', stroke: s.stroke || '#222', strokeWidth: s.strokeWidth || 2});
          r.__own = true;
          c.add(r);
        } else if (s.type === 'text') {
          const t = new fabric.Textbox(s.text || 'text', { left: s.left, top: s.top, fontSize: s.fontSize || 16, originX: s.originX || 'left' });
          t.__own = true;
          c.add(t);
        }
      });
      c.renderAll();
    } else {
      alert("AI clean failed: " + (json.error || "unknown"));
    }
  }

  async function handleSave(){
    const c = fabricRef.current;
    const json = JSON.stringify(c.toJSON(['selectable','originX','originY']));
    const thumb = c.toDataURL({ format:'png', multiplier: 0.3 });
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/diagrams`, {
      method: "POST",
      headers: {"Content-Type":"application/json", ...(token?{ "Authorization": `Bearer ${token}` }:{})},
      body: JSON.stringify({ title: "My Diagram", data: json, thumbnail: thumb })
    });
    alert("Saved to gallery (demo)");
  }

  return (
    <div className="whiteboard-shell">
      <Toolbar
        tool={tool} setTool={(t)=>{
          setTool(t);
          if (t === 'rect' || t === 'ellipse' || t === 'text' || t === 'arrow') {
            addShapeOfType(t);
            setTool('select');
          }
        }}
        color={color} setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        onAIclean={doAIClean}
        onSave={handleSave}
      />
      <div className="canvas-wrap">
        <canvas id="board" />
      </div>
    </div>
  );
}
