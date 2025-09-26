import React, { useState } from "react";
import ToolbarTop from "./components/ToolbarTop";
import ToolbarSide from "./components/ToolbarSide";
import CanvasBoard from "./components/CanvasBoard";

export default function App() {
  const [activeTool, setActiveTool] = useState("pen");
  const [color, setColor] = useState("#000000");

  // Undo/Redo/Save handlers will be passed down if needed
  const undo = () => window.dispatchEvent(new Event("undo"));
  const redo = () => window.dispatchEvent(new Event("redo"));
  const save = () => window.dispatchEvent(new Event("save"));
  const aiClean = () => window.dispatchEvent(new Event("aiClean"));

  return (
    <div className="app">
      <div className="workspace">
        <ToolbarSide activeTool={activeTool} setActiveTool={setActiveTool} />
        <CanvasBoard activeTool={activeTool} color={color} />
        <ToolbarTop
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          undo={undo}
          redo={redo}
          save={save}
          aiClean={aiClean}
          color={color}
          setColor={setColor}
        />
      </div>
    </div>
  );
}
