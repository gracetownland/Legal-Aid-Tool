import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import SideMenu from "./SideMenu";
import TypingIndicator from "./TypingIndicator";

import SendIcon from "@mui/icons-material/Send";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MicIcon from "@mui/icons-material/Mic";
import SummarizeIcon from "@mui/icons-material/Summarize";

const InterviewAssistant = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState("student"); // Default role is "student"
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text:
        "Hi, I'm your Legal Interview Assistant. Try asking me to analyze the case to begin!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAItyping, setIsAItyping] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchCaseData = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      console.log("Token: ", token);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Case not found");
        const data = await response.json();
        console.log("Case data: ", data);
        setCaseData(data.caseData);

        const userRole =
          session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
        setUserRole(userRole);
      } catch (error) {
        console.error("Error fetching case data:", error);
        setCaseData(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchMessages = async () => {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_messages?case_id=${caseId}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Messages not found");

        const data = await response.json();
        console.log("Messages data: ", data);

        // Transform fetched data and clean user messages
        const formattedMessages = data.map((msg) => ({
          sender: msg.type === "ai" ? "bot" : "user",
          text:
            msg.type === "human"
              ? msg.content.replace(/^\s*user\s*/, "").trim() // Remove unwanted prefix
              : msg.content.trim(),
        }));

        // Remove the first message if it's from a user
        const filteredMessages =
          formattedMessages[0]?.sender === "user"
            ? formattedMessages.slice(1)
            : formattedMessages;

        setMessages(filteredMessages);
      } catch (error) {
        console.error("Error fetching messages data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
    fetchMessages();
  }, [caseId]);

  const handleBack = () => {
    navigate("/"); // Navigate to the homepage
  };

  const handleSendMessage = async () => {
    if (userInput.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text: userInput },
      ]);
      setUserInput(""); // Reset input field

      // Await the AI response before updating the messages
      setIsAItyping(true);
      const llmResponse = await getAIResponse(userInput);
      console.log("LLM Responded with: ", llmResponse);

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: llmResponse },
      ]);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleAudioUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Uploaded audio file:", file);
    }
  };

  async function getAIResponse(userInput) {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    async function getFetchBody() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/text_generation?case_id=${caseId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({
              message_content: userInput,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const res = data.llm_output.llm_output;
        console.log("Success:", data);
        setIsAItyping(false);
        return res;
      } catch (error) {
        console.error("Error:", error);
        setIsAItyping(false);
        return "Error getting response.";
      }
    }

    const body = await getFetchBody();
    return body;
  }

  // Identify the index of the most recent bot message.
  const lastBotIndex = messages.reduce(
    (lastIndex, message, index) =>
      message.sender === "bot" ? index : lastIndex,
    -1
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 2,
        backgroundColor: "transparent",
        color: "var(--text)",
        marginTop: "75px",
      }}
    >
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

      <Box sx={{ display: "flex" }}>
        <SideMenu />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 2,
            width: "100%",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2, textAlign: "left" }}>
              {caseData?.case_title || "Case Title Not Available"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                marginBottom: 2,
                textAlign: "left",
                border: "1px solid var(--border)",
                padding: 2,
                borderRadius: 1,
              }}
            >
              <strong>Case Overview:</strong>{" "}
              {caseData?.case_description || "Overview information not available."}
            </Typography>
            <Divider sx={{ borderColor: "var(--text)" }} />
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "500px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: 2,
                padding: 2,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: 999,
              }}
            >
              <CircularProgress sx={{ width: "150px", color: "var(--text)" }} />
            </Box>
          ) : (
            <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
              {messages.map((message, index) => {
                // For bot messages that are the most recent, use a column layout:
                if (message.sender === "bot" && index === lastBotIndex) {
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        marginTop: 3,
                        marginBottom: 10,
                      }}
                    >
                      <Paper
                        sx={{
                          maxWidth: "60%",
                          padding: "0 1em",
                          backgroundColor: "var(--bot-text)",
                          borderRadius: 2,
                          boxShadow: "none",
                          color: "var(--text)",
                          fontFamily: "'Roboto', sans-serif",
                        }}
                      >
                        <Typography variant="body1" sx={{ textAlign: "left" }}>
                          <div className="markdown">
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </div>
                        </Typography>
                      </Paper>
                      {/* Render buttons directly underneath the bot bubble */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigator.clipboard.writeText(message.text)}
                          startIcon={<ContentCopyIcon fontSize="small" />}
                          sx={{ fontSize: "0.7rem", border: 'none'}}
                        >
                        </Button>
                        <Button
                          size="small"
                          startIcon={<MicIcon fontSize="small" />}
                          sx={{ fontSize: "0.7rem", border:'none', backgroundColor:'transparent',}}
                          onClick={() => {
                            const utterance = new SpeechSynthesisUtterance(message.text);
                            speechSynthesis.speak(utterance);
                          }}
                        >
                        </Button>
                        {messages.length >= 5 && (
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", border: 'none', backgroundColor:'transparent',}}
                            onClick={() => handleSendMessage("Can you summarize that?")}
                          >
                            Generate Summary
                          </Button>
                        )}
                      </Box>
                    </Box>
                  );
                } else {
                  // For user messages or bot messages that are not the latest, use the default layout.
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        flexDirection: message.sender === "bot" ? "row" : "row-reverse",
                        marginTop: 3,
                        marginBottom: 10,
                        fontFamily: "'Roboto', sans-serif",
                      }}
                    >
                      <Paper
                        sx={{
                          maxWidth: "60%",
                          padding: "0 1em",
                          backgroundColor:
                            message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)",
                          borderRadius: 2,
                          boxShadow: "none",
                          marginLeft: message.sender === "bot" ? 0 : "auto",
                          marginRight: message.sender === "bot" ? "auto" : 0,
                          color: "var(--text)",
                          fontFamily: "'Roboto', sans-serif",
                        }}
                      >
                        <Typography variant="body1" sx={{ textAlign: "left" }}>
                          <div className="markdown">
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </div>
                        </Typography>
                      </Paper>
                    </Box>
                  );
                }
              })}
            </Box>
          )}

          {isAItyping && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 6,
                marginTop: 0,
              }}
            >
              <TypingIndicator />
            </Box>
          )}

          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0)",
              boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
              padding: 2,
            }}
          >
            <Box
              sx={{
                position: "fixed",
                bottom: 0,
                right: 0,
                minHeight: "65px",
                width: "calc(100% - 250px)",
                minWidth: "70vw",
                display: "flex",
                justifyContent: "center",
                backgroundColor: "var(--background)",
                boxShadow: "none",
                padding: 2,
                background: "none",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "90vw",
                  maxHeight: "650px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Type here..."
                  variant="outlined"
                  fullWidth
                  multiline
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  sx={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    marginRight: "0.5em",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--background)",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" },
                  }}
                  onKeyDown={handleKeyPress}
                  InputLabelProps={{
                    style: { backgroundColor: "transparent", color: "var(--text)" },
                  }}
                  InputProps={{
                    style: { backgroundColor: "transparent", color: "var(--text)" },
                  }}
                />

                {/* AUDIO UPLOAD BUTTON (COMMENTED OUT) */}
                {/* <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "0.5em",
                    width: "55px",
                    height: "50px",
                    borderRadius: "10%",
                    backgroundColor: "var(--secondary)",
                    cursor: "pointer",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                 <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: "0.5em",
                    width: "55px",
                    height: "50px",
                    borderRadius: "10%",
                    backgroundColor: "var(--secondary)",
                    cursor: "pointer",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <label htmlFor="audio-upload" style={{ cursor: "pointer" }}>
                    <MicIcon sx={{ width: "30px", height: "30px", color: "white" }} />
                    <input
                      type="file"
                      id="audio-upload"
                      accept="audio/*"
                      style={{ display: "none" }}
                      onChange={handleAudioUpload}
                    />
                  </label>
                </div> */}

                <Button
                  variant="contained"
                  sx={{
                    color: "#ffffff",
                    backgroundColor: "var(--secondary)",
                    minHeight: "50px",
                  }}
                  style={{ boxShadow: "none" }}
                  onClick={handleSendMessage}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
