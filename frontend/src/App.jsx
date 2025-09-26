import React, { useRef, useState } from "react";
import ToolbarTop from "./components/ToolbarTop";
import ToolbarSide from "./components/ToolbarSide";
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
      case "undo": board.undo(); break;
      case "redo": board.redo(); break;
      case "save": board.saveToGallery(); break;
      case "aiClean": board.aiCleanup(); break;
      case "download": board.downloadImage(); break;
      default: break;
    }
  };

  return (
    <div className="app">
      <ToolbarTop doAction={handleAction} />
      <div className="workspace">
        <ToolbarSide
          currentTool={currentTool}
          setTool={setCurrentTool}
          setColor={setCurrentColor}
        />
        <div className="board-wrap">
          <CanvasBoard
            ref={boardRef}
            currentTool={currentTool}
            currentColor={currentColor}
          />
        </div>
      </div>
    </div>
  );
}
