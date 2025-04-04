import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, TextField, Button, Paper, Divider, CircularProgress } from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

import StudentHeader from "../../components/StudentHeader";
import SideMenu from "./SideMenu";
import TypingIndicator from "./TypingIndicator";
import { useRef } from "react"; // Import useRef at the top

const InterviewAssistant = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

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
              ? msg.content.replace(/^\s*user\s*/, "").trim() // Remove the unwanted prefix
              : msg.content.trim(),
        }));
        
        // Remove the first message only if it's from a user (to prompt llm to start, but hide that user prompt to make it look like it spoke first)
        const filteredMessages =
          formattedMessages[0]?.sender === "user" ? formattedMessages.slice(1) : formattedMessages;
        
        setMessages(filteredMessages);
        setMessages(formattedMessages.slice(1)); // Remove the initial message to prompt llm to respond first
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

  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, I'm your Legal Interview Assistant. Try asking me to analyze the case to begin!" },
  ]);

  const [userInput, setUserInput] = useState("");
  const [isAItyping, setIsAItyping] = useState(false);

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
      console.log("LLM Responded with: ", llmResponse); // Check the response in the console

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: llmResponse }, // Bot response
      ]);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent default behavior of Enter key
      handleSendMessage();
    }
  };

  const promptPreliminarySummary = () => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        sender: "bot",
        text: "Would you like me to generate a preliminary summary of the case so far? This can help consolidate key points from our discussion.",
      },
    ]);
  };

  useEffect(() => {
    if (messages.length === 5) {
      promptPreliminarySummary();
    }
  }, [messages]);

  async function getAIResponse(userInput) {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;

    async function getFetchBody() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/text_generation?case_id=${caseId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token
          },
          body: JSON.stringify({
            message_content: userInput
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const res = data.llm_output.llm_output;
        console.log('Success:', data);
        setIsAItyping(false);
        return res;
      } catch (error) {
        console.error('Error:', error);
        setIsAItyping(false);
        return "Error getting response.";
      }
    }

    const body = await getFetchBody();
    return body;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 2,
        backgroundColor: "transparent",
        color: "var(--text)",
        marginTop: '75px'
      }}
    >
      <StudentHeader /> {/* StudentHeader added at the top */}

      <Box sx={{ display: "flex"}}>
        <SideMenu />

        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 2, width: "100%" }}>

          {/* Case Title and Information */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2, textAlign: "left"}}>
              Case #{caseData?.case_hash || "Case Title Not Available"}
            </Typography>
            <Typography variant="body2" sx={{ marginBottom: 2, textAlign: "left" }}>
              <strong>Case Overview:</strong> {caseData?.case_description || "Overview information not available."}
            </Typography>
            <Divider sx={{ borderColor: "var(--text)" }} />
          </Box>

          {/* Loading screen */}
          {loading ? (
            <Box 
              sx={{
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                height: "500px", 
                backgroundColor: "rgba(255, 255, 255, 0.3)", // White translucent background
                borderRadius: 2, // Optional: Adds rounded corners for a smoother look
                padding: 2, // Optional: Adds padding around the progress circle
                position: "absolute", // Optional: Makes sure it overlays the content if needed
                top: 0, 
                left: 0, 
                width: "100%", 
                zIndex: 999, // Ensure it's on top of other elements
              }}
            >
              <CircularProgress sx={{ width: '150px', color: 'var(--text)' }} /> {/* Increased size for the circular progress */}
            </Box>
          ) : (
            <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
              {messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    flexDirection: message.sender === "bot" ? "row" : "row-reverse",
                    marginTop: 3,
                    marginBottom: 10,
                    fontFamily: "'Roboto', sans-serif",
                    boxShadow: 'none'
                  }}
                >
                  <Paper
                    sx={{
                      maxWidth: "60%",
                      padding: "0 1em",
                      backgroundColor: message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)",
                      borderRadius: 2,
                      boxShadow: 'none',
                      marginLeft: message.sender === "bot" ? 0 : "auto",
                      marginRight: message.sender === "bot" ? "auto" : 0,
                      color: "var(--text)",
                      fontFamily: "'Roboto', sans-serif"
                    }}
                  >
                    <Typography variant="body1" sx={{ textAlign: "left" }}>
                      <div className="markdown">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          )}

          {isAItyping && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", marginBottom: 6, marginTop: 0 }}>
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
              boxShadow: "0 -2px 5px rgba(0,0,0,0.1)", 
              padding: 2 
            }}
          >
            <Box 
              sx={{ 
                position: "fixed", 
                bottom: 0, 
                right: 0,
                minHeight: "65px",
                width: "calc(100% - 250px)",  // Exclude sidebar
                minWidth: "70vw", // Ensure it doesn't get too small
                display: "flex", 
                justifyContent: "center",
                backgroundColor: "var(--background)", 
                boxShadow: "none", 
                padding: 2 ,
                backgroundColor: "white"
              }}
            >
              <Box 
                sx={{ 
                  width: "100%", 
                  maxWidth: "90vw",  // Keep it readable
                  maxHeight: "650px", // Limit height for better UX
                  display: "flex", 
                  alignItems: "center" 
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
                    marginRight: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                  }}
                  onKeyDown={handleKeyPress}
                  InputLabelProps={{ style: { backgroundColor: "transparent", color: "var(--text)" } }}
                  InputProps={{ style: { backgroundColor: "transparent", color: "var(--text)" } }}
                />
                <Button 
                  variant="contained" 
                  sx={{ color: "#ffffff", backgroundColor: "var(--secondary)", minHeight: "50px" }} 
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
