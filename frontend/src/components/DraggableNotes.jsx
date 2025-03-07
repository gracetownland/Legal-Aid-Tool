import React, { useState, useRef, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { Box, Button, Typography, Switch, FormControlLabel} from "@mui/material";

function DraggableNotes({ onClose, sessionId }) {
  const [noteContent, setNoteContent] = useState("");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const noteRef = useRef(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState(false);

  // Load notes when component mounts
  useEffect(() => {
    if (sessionId) {
      fetchNotes(sessionId);
    }
  }, [sessionId]);

  const fetchNotes = async (sessionId) => {
    try {
      const authSession = await fetchAuthSession();
      const token = authSession.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/get_notes?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNoteContent(data.notes || "");
      } else {
        console.error("Failed to fetch notes.");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleNoteChange = (e) => {
    setNoteContent(e.target.value);
  };

  const handleSave = async () => {
    try {
      const authSession = await fetchAuthSession();
      const token = authSession.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/update_notes?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: noteContent }),
        }
      );

      if (response.ok) {
        toast.success("Notes saved successfully!", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "colored",
        });
      } else {
        console.error("Failed to save notes.");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

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

  const handleToggleAutosave = () => {
    setIsAutosaveEnabled((prev) => !prev);
  };

  return (
    <Box
      ref={noteRef}
      onMouseDown={handleMouseDown}
      sx={{
        position: "absolute",
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor: "#f7f07d",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        cursor: "grab",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "#232323",
          padding: "8px 12px",
          borderRadius: "10px 10px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
        }}
      >
        <Typography variant="h6">Notes</Typography>
        <HighlightOffIcon
          onClick={onClose}
          sx={{ cursor: "pointer", color: "white" }}
        />
      </Box>

      {/* Textarea */}
      <Box sx={{ height: "calc(100% - 80px)", padding: "10px" }}>
        <textarea
          style={{
            width: "100%",
            height: "100%",
            padding: "10px",
            backgroundColor: "#f7f07d",
            color: "#333",
            fontSize: "14px",
            resize: "none",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          }}
          className="note-text-area"
          placeholder="Write your notes here..."
          value={noteContent}
          onChange={handleNoteChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
            }
          }}
        />
      </Box>

      {/* Save Button */}
      <Box sx={{ padding: "5px 10px", textAlign: "right", marginTop: "5px", marginBottom: "10px" }}>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            backgroundColor: "#36bd78",
            color: "white",
            border: "none",
            padding: "5px 10px",
            fontSize: "12px",
            borderRadius: "4px",
            cursor: "pointer",
            width: "80px",
            position: "absolute",
            bottom: 10,
            right: 10,
          }}
        >
          Save
        </Button>
      </Box>

      {/* Autosave Toggle Button */}
      

      <FormControlLabel
        control={
          <Switch
            checked={isAutosaveEnabled}
            onChange={handleToggleAutosave}
          />
        }
        label={isAutosaveEnabled ? "Autosave On" : "Autosave Off"}
        sx={{ position: "absolute", bottom: 10, left: 10, color: "#b89d24a8",
          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
          backgroundColor: "#b89d24a8", // Track color when ON
        },
        "& .MuiSwitch-track": {
          backgroundColor: "#b89d24a8", // Track color when OFF
        },
        "& .MuiSwitch-switchBase.Mui-checked": {
          color: "white", // Thumb (circle) color when ON
        },

         }}
      />;


      {/* Resizer Handle */}
      <Box
        onMouseDown={handleResizeMouseDown}
        sx={{
          width: "10px",
          height: "10px",
          backgroundColor: "#ccc",
          position: "absolute",
          right: "0",
          bottom: "0",
          cursor: "nwse-resize",
          borderRadius: "0 0 10px 0",
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
