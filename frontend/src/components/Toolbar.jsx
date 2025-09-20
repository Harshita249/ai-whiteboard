import React from "react";

export default function Toolbar({tool, setTool, color, setColor, strokeWidth, setStrokeWidth, onAIclean, onSave}) {
  return (
    <div className="toolbar">
      <div className="tool-row">
        <button className={tool==='select'?'active':''} onClick={()=>setTool('select')}>Select</button>
        <button className={tool==='pen'?'active':''} onClick={()=>setTool('pen')}>Pen</button>
        <button className={tool==='rect'?'active':''} onClick={()=>setTool('rect')}>Rect</button>
        <button className={tool==='ellipse'?'active':''} onClick={()=>setTool('ellipse')}>Ellipse</button>
        <button className={tool==='arrow'?'active':''} onClick={()=>setTool('arrow')}>Arrow</button>
        <button className={tool==='text'?'active':''} onClick={()=>setTool('text')}>Text</button>
      </div>

      <div className="tool-row">
        <label className="color-label">Color
          <input className="color-picker" type="color" value={color} onChange={e=>setColor(e.target.value)} />
        </label>

        <label>Size
          <input type="range" min="1" max="30" value={strokeWidth} onChange={e=>setStrokeWidth(parseInt(e.target.value))} />
        </label>

        <button onClick={onAIclean} title="AI Clean Up">AI Clean</button>
        <button onClick={onSave} title="Save to Gallery">Save</button>
      </div>
    </div>
  );
}
