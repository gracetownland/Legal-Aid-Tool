import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { fetchAuthSession } from "aws-amplify/auth";

const Session = ({
  text,
  session,
  setSession,
  deleteSession,
  selectedSession,
  setMessages,
  setSessions,
  sessions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newSessionName, setNewSessionName] = useState(text);

  const inputRef = useRef(null);
  const sessionRef = useRef(null);

  // Handle clicks outside the session component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sessionRef.current && !sessionRef.current.contains(event.target)) {
        handleInputBlur(); // Save changes when clicking outside
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleInputBlur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [newSessionName]);

  const isSelected =
    selectedSession && selectedSession.session_id === session.session_id;

  const handleSessionClick = () => {
    if (selectedSession && selectedSession.session_id !== session.session_id) {
      setMessages([]);
    }
    setSession(session);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    deleteSession(session);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    if (inputValue.length <= 20) {
      setNewSessionName(inputValue);
    }
  };

  const handleInputBlur = async () => {
    setIsEditing(false);
    if (newSessionName !== text) {
      updateSessionName(session.session_id, newSessionName).catch((err) => {
        console.error("Failed to update session name:", err);
      });
    }
  };

  const updateSessionName = (sessionId, newName) => {
    const updatedName = newName.trim() === "" ? "New Chat" : newName;

    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.session_id === sessionId
          ? { ...session, session_name: updatedName }
          : session
      )
    );

    return fetchAuthSession()
      .then((authSession) => {
        const token = authSession.tokens.idToken;
        return fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }student/update_session_name?session_id=${encodeURIComponent(
            sessionId
          )}`,
          {
            method: "PUT",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_name: updatedName }),
          }
        );
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update session name");
        }
      })
      .catch((error) => {
        console.error("Error updating session name:", error);
      });
  };

  return (
    <div
      onClick={handleSessionClick}
      style={{
        background: isSelected ? "#e1f0ec" : "#f2f9f7", // softer green tones
        boxShadow: isSelected
          ? "0px 4px 8px rgba(0, 0, 0, 0.1)"
          : "0px 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      className={`cursor-pointer rounded-lg flex flex-row justify-between items-center my-2 mx-8 py-3 px-5 hover:transform hover:scale-105`}
    >
      <div
        onDoubleClick={handleDoubleClick}
        className="flex flex-row items-center justify-start gap-4"
      >
        <img src="/message.png" alt="message" className="w-4 h-4" />
        {isEditing ? (
          <input
            type="text"
            value={newSessionName}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            autoFocus
            className="text-[#333333] font-light font-inter text-sm bg-transparent border-none outline-none"
          />
        ) : (
          <div className="text-[#333333] font-light font-inter text-sm">
            {text}
          </div>
        )}
      </div>
      <div
        onClick={handleDeleteClick}
        className="cursor-pointer w-4 h-4 flex items-center justify-center ml-2"
      >
        <img src="/delete.png" alt="delete" className="w-4 h-4 opacity-70 hover:opacity-100" />
      </div>
    </div>
  );
};

export default Session;