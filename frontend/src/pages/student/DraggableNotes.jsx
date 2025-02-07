import React, { useState, useRef, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchAuthSession } from "aws-amplify/auth";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

function DraggableNotes({ onClose, sessionId }) {
  const [noteContent, setNoteContent] = useState("");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const noteRef = useRef(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);

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

  return (
    <div
      ref={noteRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        cursor: "grab",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#989898",
          padding: "8px 12px",
          borderRadius: "10px 10px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
        }}
      >
        <span style={{ fontWeight: "bold" }}>Notes</span>
        <HighlightOffIcon
          onClick={onClose}
          style={{ cursor: "pointer", color: "white" }}
        />
      </div>

      {/* Textarea */}
      <div style={{ height: "calc(100% - 80px)", padding: "10px" }}>
        <textarea
          style={{
            width: "100%",
            height: "100%",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            backgroundColor: "#f9f9f9",
            color: "#333",
            fontSize: "14px",
            resize: "none",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          }}
          placeholder="Write your notes here..."
          value={noteContent}
          onChange={handleNoteChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Ensure pressing Enter creates a new line
              e.stopPropagation(); // Stop event propagation if needed
            }
          }}
        />
      </div>

      {/* Save Button */}
      <div style={{ padding: "5px 10px", textAlign: "right", marginTop: "5px", marginBottom: "10px" }}>
        <button
          onClick={handleSave}
          style={{
            backgroundColor: "#36bd78",
            color: "white",
            border: "none",
            padding: "5px 10px",
            fontSize: "12px",
            borderRadius: "4px",
            cursor: "pointer",
            width: "80px",
          }}
        >
          Save
        </button>
      </div>

      {/* Resizer Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          width: "10px",
          height: "10px",
          backgroundColor: "#ccc",
          position: "absolute",
          right: "0",
          bottom: "0",
          cursor: "nwse-resize",
          borderRadius: "0 0 10px 0",
        }}
      ></div>

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
    </div>
  );
}

export default DraggableNotes;
