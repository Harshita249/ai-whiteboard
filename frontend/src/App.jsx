import React, { useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import CanvasBoard from "./components/CanvasBoard";
import "./styles.css";

export default function App() {
  const [currentTool, setCurrentTool] = useState("pen");
  const [currentColor, setCurrentColor] = useState("#000000");
  const boardRef = useRef(null);

  const handleAction = (name) => {
    const board = boardRef.current;
    if (!board) return;
    switch (name) {
      case "undo":
        board.undo();
        break;
      case "redo":
        board.redo();
        break;
      case "save":
        board.saveToGallery();
        break;
      case "aiClean":
        board.aiCleanup();
        break;
      case "download":
        board.downloadImage();
        break;
      default:
        break;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">AI Whiteboard</div>
      </header>

      <div className="workspace">
        <Toolbar
          currentTool={currentTool}
          setTool={setCurrentTool}
          setColor={setCurrentColor}
          doAction={handleAction}
        />

        <div className="board-wrap">
          <div className="board-shell">
            <CanvasBoard
              ref={boardRef}
              currentTool={currentTool}
              currentColor={currentColor}
            />
          </div>
        </div>

        {/* right panel is optional - keep space or your Gallery */}
        <aside className="right-panel">
          <h3>Gallery</h3>
          <div className="small">Open saved items here</div>
        </aside>
      </div>
    </div>
  );
}
