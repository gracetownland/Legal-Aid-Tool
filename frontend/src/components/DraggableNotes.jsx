import React, { useState, useRef, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { Box, Button, Typography } from "@mui/material";
import TextEditor from "./TextEditor";

function DraggableNotes({ onClose, sessionId }) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const noteRef = useRef(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const handleMouseDown = (e) => {
    if (e.target.tagName.toLowerCase() === "textarea" || isResizing.current) return;

    isDragging.current = true;
    noteRef.current.style.cursor = "grabbing";

    const offsetX = e.clientX - position.x;
    const offsetY = e.clientY - position.y;

    const handleMouseMove = (moveEvent) => {
      if (isDragging.current) {
        setPosition({
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      noteRef.current.style.cursor = "grab";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const onMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const newHeight = startHeight + (moveEvent.clientY - startY);

      setDimensions({
        width: newWidth > 200 ? newWidth : 200,
        height: newHeight > 150 ? newHeight : 150,
      });
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <Box
      ref={noteRef}
      sx={{
        position: "fixed",
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor: "#f7f07d",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          backgroundColor: "#232323",
          padding: "8px 12px",
          borderRadius: "10px 10px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "grab",
          color: "white",
        }}
      >
        <Typography variant="h6">Case Notes</Typography>
        <HighlightOffIcon
          onClick={onClose}
          sx={{ cursor: "pointer", color: "white" }}
        />
      </Box>

      {/* Text Editor */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          width: "100%",
          height: "calc(100% - 100px)", // Adjust for header height
          cursor: "auto",
        }}
      >
        <TextEditor lastSaved={lastSaved} setLastSaved={setLastSaved} />
      </Box>

      {lastSaved && (
                <div style={{
                    position: 'absolute',
                    zIndex: 1000,
                    bottom: '8px',
                    left: '10px',
                    fontSize: '12px',
                    color: '#808080',
                }}>
                    Last saved at {lastSaved}
                </div>
            )}

      {/* Save Button */}
      <Box sx={{ padding: "5px 10px", textAlign: "right", marginTop: "5px", marginBottom: "10px" }}>
        <Button
          id="saveButton"
          variant="contained"
          sx={{
            backgroundColor: "#36bd78",
            color: "white",
            width: "80px",
            position: "absolute",
            bottom: 10,
            right: 10,
            boxShadow: 'none',
            "&:hover": {
              backgroundColor: "#45c485",
              boxShadow: 'none',
            },
          }}
        >
          Save
        </Button>
      </Box>

      {/* Resizer Handle */}
      <Box
        onMouseDown={handleResizeMouseDown}
        sx={{
          width: "10px",
          height: "10px",
          backgroundColor: "#db5",
          position: "absolute",
          right: "0",
          bottom: "0",
          cursor: "nwse-resize",
          borderRadius: "5px 0 10px 0",
        }}
      ></Box>

      {/* Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Box>
  );
}
export default DraggableNotes;
