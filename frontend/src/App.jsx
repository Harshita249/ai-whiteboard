import React, { useRef, useState } from "react";
import ToolbarTop from "./components/ToolbarTop";
import ToolbarSide from "./components/ToolbarSide";
import CanvasBoard from "./components/CanvasBoard";
import Gallery from "./components/Gallery";
import "./styles.css";

export default function App() {
  const boardRef = useRef(null);
  const [activeTool, setActiveTool] = useState("pen");
  const [color, setColor] = useState("#000000");

  // central action dispatcher used by top toolbar
  const handleAction = (name) => {
    if (!boardRef.current) return;
    switch (name) {
      case "undo":
        boardRef.current.undo();
        break;
      case "redo":
        boardRef.current.redo();
        break;
      case "save":
        boardRef.current.saveToGallery && boardRef.current.saveToGallery();
        break;
      case "aiClean":
        boardRef.current.aiClean && boardRef.current.aiClean();
        break;
      case "download":
        boardRef.current.downloadImage && boardRef.current.downloadImage();
        break;
      default:
        break;
    }
  };

  // Allow Gallery to load an image onto canvas
  const handleLoadFromGallery = (dataUrl) => {
    boardRef.current && boardRef.current.loadImage && boardRef.current.loadImage(dataUrl);
  };

  return (
    <div className="app">
      <ToolbarTop
        doAction={handleAction}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        color={color}
        setColor={setColor}
      />

      <div className="workspace-row">
        <ToolbarSide activeTool={activeTool} setActiveTool={setActiveTool} setColor={setColor} />

        <div className="board-column">
          <CanvasBoard ref={boardRef} activeTool={activeTool} strokeColor={color} />
        </div>

        <aside className="right-column">
          <Gallery onLoad={handleLoadFromGallery} />
        </aside>
      </div>
    </div>
  );
}
