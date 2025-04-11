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
import StopRounded from "@mui/icons-material/StopRounded";
import { VolumeUpRounded } from "@mui/icons-material";

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
  const [utterance, setUtterance] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if TTS is speaking

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

    // Function to start TTS
    const startTTS = (text) => {
      const newUtterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(newUtterance);
      setUtterance(newUtterance);
      setIsSpeaking(true); // Set speaking to true when TTS starts
    };
  
    // Function to stop TTS
    const stopTTS = () => {
      if (utterance) {
        speechSynthesis.cancel(); // Stop the speech
        setIsSpeaking(false); // Set speaking to false when TTS stops
      }
    };

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
  
  const handleGenerateSummary = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
  
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/summary_generation?case_id=${caseId}`,
        {
          method: "POST",
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
          
        }
      );
  
      if (!response.ok) throw new Error("Failed to submit feedback");
  
      // setSnackbar({
      //   open: true,
      //   message: "Message sent successfully!",
      //   severity: "success",
      // });
    } catch (error) {
      console.error("Error generating summaries:", error);
      // setSnackbar({
      //   open: true,
      //   message: "Failed to generate summaries.",
      //   severity: "error",
      // });
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
                          borderRadius: 10,
                          borderBottomLeftRadius: message.sender === "bot" ? 7 : '10',
                          borderBottomRightRadius: message.sender === "bot" ? '10' : 7,
                          paddingY: 1,
                          paddingX: 3,              
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
        justifyContent: "flex-end", // Right align
        gap: 1,
        mt: 2,
      }}
    >
      <Button
        size="small"
        disableRipple
        onClick={() => navigator.clipboard.writeText(message.text)}
        sx={{
          minWidth: 30,
          width: 30,
          height: 30,
          p: 0,
          color: '#808080',
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </Button>

      <Button
        size="small"
        disableRipple
        onClick={() => (isSpeaking ? stopTTS() : startTTS(message.text))}
        sx={{
          minWidth: 30,
          width: 30,
          height: 30,
          p: 0,
          color: '#808080',
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
        }}
      >
        {isSpeaking ? <StopRounded fontSize="small" /> : <VolumeUpRounded fontSize="small" />}
      </Button>

      {messages.length >= 5 && (
        <Button
          size="small"
          disableRipple
          variant="outlined"
          sx={{
            fontSize: "0.7rem",
            px: 1.2,
            py: 0.5,
            backgroundColor: 'transparent',
            color: '#808080',
            borderColor: 'var(--border)',
            whiteSpace: 'nowrap',
            height: 30,
            outline: 'none',
            '&:focus': {
              outline: 'none',
              boxShadow: 'none',
            },
          }}
          onClick={() => handleGenerateSummary()}
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
                    <div>
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        flexDirection: message.sender === "bot" ? "row" : "row-reverse",
                        marginTop: 3,
                        marginBottom: 0,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      
                      <Paper
                        sx={{
                          maxWidth: "60%",
                          padding: "0 1em",
                          backgroundColor:
                            message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)",
                          borderRadius: 10,
                          borderBottomLeftRadius: message.sender === "bot" ? 7 : '10',
                          borderBottomRightRadius: message.sender === "bot" ? '10' : 7,
                          paddingY: message.sender== "bot" ? 1 : 0,
                          paddingX: 3, 
                          boxShadow: "none",
                          marginLeft: message.sender === "bot" ? 0 : "auto",
                          marginRight: message.sender === "bot" ? "auto" : 0,
                          color: "var(--text)",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <Typography variant="body1" sx={{ textAlign: "left" }}>
                          <div className="markdown">
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </div>
                        </Typography>

                        
                      </Paper>
                      
                    </Box>
                    <Box
  sx={{
    display: "flex",
    gap: 1,
    mt: 1,
    position: "absolute", // Ensures the buttons align with the message properly
    right: message.sender !== "bot" ? 30 : "auto", // Align right if sender is not a bot
    left: message.sender === "bot" ? 272 : "auto",  // Align left if sender is a bot
    opacity: 0,
    transition: "opacity 0.3s ease-in-out",
    "&:hover": {
      opacity: 1,
    },
  }}
>
<Button
  size="small"
  disableRipple
  onClick={() => navigator.clipboard.writeText(message.text)}
  sx={{
    minWidth: 30,
    width: 30,
    height: 30,
    p: 0,
    color: '#808080',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    '&:focus': {
      outline: 'none',
      boxShadow: 'none',
    },
  }}
>
  <ContentCopyIcon fontSize="small" />
</Button>

<Button
        size="small"
        disableRipple
        onClick={() => (isSpeaking ? stopTTS() : startTTS(message.text))}
        sx={{
          minWidth: 30,
          width: 30,
          height: 30,
          p: 0,
          color: '#808080',
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
        }}
      >
        {isSpeaking ? <StopRounded fontSize="small" /> : <VolumeUpRounded fontSize="small" />}
      </Button>
</Box>
                    </div>

                    
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
              backgroundColor: "var(--background)",
              boxShadow: "none",
              padding: 2,
            }}
          >
            <Box
              sx={{
                position: "fixed",
                bottom: 0,
                right: 0,
                minHeight: "80px",
                width: "calc(100% - 250px)",
                minWidth: "70vw",
                display: "flex",
                justifyContent: "center",
                backgroundColor: "var(--background)",
                boxShadow: "none",
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
                  backgroundColor: "var(--background)",
                   
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
