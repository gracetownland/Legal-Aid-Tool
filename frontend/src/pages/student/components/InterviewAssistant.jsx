import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, TextField, Button, Paper, Divider } from "@mui/material";
import { useParams } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

import StudentHeader from "../../../components/StudentHeader";
import SideMenu from "./SideMenu";
import TypingIndicator from "./TypingIndicator";

const InterviewAssistant = () => {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, I'm your Legal Interview Assistant. Let's get started!" },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isAItyping, setIsAItyping] = useState(false);

  useEffect(() => {
    const fetchCaseData = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}`,
          {
            method: "GET",
            headers: { Authorization: token, "Content-Type": "application/json" },
          }
        );
        if (!response.ok) throw new Error("Case not found");
        const data = await response.json();
        setCaseData(data);
      } catch (error) {
        console.error("Error fetching case data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCaseData();
  }, [caseId]);

  const handleSendMessage = async () => {
    if (userInput.trim()) {
      setMessages([...messages, { sender: "user", text: userInput }]);
      setUserInput("");
      setIsAItyping(true);
      const llmResponse = await getAIResponse(userInput);
      setMessages([...messages, { sender: "bot", text: llmResponse }]);
      setIsAItyping(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  async function getAIResponse(userInput) {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/text_generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ message_content: userInput })
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      return data.llm_output;
    } catch (error) {
      console.error('Error:', error);
      return "Error getting response.";
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", textAlign: "left" }}>
      <StudentHeader />
      <Box sx={{ display: "flex", flexGrow: 1 }}>
        <SideMenu />
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
            Case #{caseData?.case_hash || "Case Title Not Available"}
          </Typography>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            <strong>Case Overview:</strong> {caseData?.case_description || "Overview information not available."}
          </Typography>
          <Divider sx={{ marginBottom: 2 }} />
          <Box sx={{ flexGrow: 1, overflowY: "auto", paddingBottom: "8px" }}>
            {messages.map((message, index) => (
              <Box key={index} sx={{ display: "flex", flexDirection: message.sender === "bot" ? "row" : "row-reverse", marginBottom: 2 }}>
                <Paper sx={{ maxWidth: "55%", padding: "0 1em", backgroundColor: message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)", borderRadius: 2, boxShadow: 1, marginLeft: message.sender === "bot" ? 0 : "auto", marginRight: message.sender === "bot" ? "auto" : 0, color: "var(--text)" }}>
                  <Typography variant="body1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                  </Typography>
                </Paper>
              </Box>
            ))}
            {isAItyping && <TypingIndicator />}
          </Box>
<<<<<<< HEAD
          <Divider sx={{ marginTop: 1 }} />
          <Box sx={{ display: "flex", alignItems: "center", padding: 2, backgroundColor: "#f9f9f9", position: "sticky", bottom: 0 }}>
            <TextField fullWidth multiline value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={handleKeyPress} label="Type here..." variant="outlined" sx={{ marginRight: 2 }} />
            <Button variant="contained" onClick={handleSendMessage}>Send</Button>
=======
          {isAItyping && <TypingIndicator />}

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              label="Type here..."
              variant="outlined"
              fullWidth
              multiline
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              sx={{
                marginRight: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#808080', // Default border color (gray)
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#808080', // Hover border color (gray)
                },
              }}
              onKeyDown={handleKeyPress}
              InputLabelProps={{
                style: {
                  backgroundColor: "transparent",
                  color: "#808080" // Label color (gray)
                },
              }}
              InputProps={{
                style: {
                  backgroundColor: "transparent",
                  color: "var(--text)", // Text color
                },
              }}
            />
            <Button variant="contained" sx={{ color: "#ffffff", backgroundColor: "var(--accent)" }} onClick={handleSendMessage}>
              Send
            </Button>
>>>>>>> 4fb3419e93647ac565d3246ee00add94743ff175
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;