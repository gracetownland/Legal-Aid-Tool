import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Typography, TextField, Button, Paper, Divider } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";

import StudentHeader from "../../../components/StudentHeader";
import SideMenu from "./sidemenu";
import TypingIndicator from "./TypingIndicator";

const InterviewAssistant = () => {
  const location = useLocation();
  const caseData = location.state?.caseData;
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/"); // Navigate to the homepage
  };

  console.log(caseData);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, I'm your Legal Interview Assistant. Let's get started!" },
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
      console.log(llmResponse); // Check the response in the console

      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: llmResponse }, // Bot response
      ]);
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

    async function getFetchBody() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/text_generation`, {
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
        const res = data.llm_output;
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
        color: "var(--text)"
      }}
    >
      <StudentHeader /> {/* StudentHeader added at the top */}

      <Box sx={{ display: "flex" }}>
        <SideMenu />

        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 2, width: "100%" }}>
          <Button
            onClick={handleBack}
            sx={{ marginBottom: 2 }}
          >
            Back to Home Page
          </Button>

          {/* Case Title and Information */}
          <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
            {caseData?.case_title || "Case Title Not Available"}
          </Typography>
          <Typography variant="body2" sx={{ marginBottom: 2 }}>
            <strong>Case Overview:</strong> {caseData?.case_description || "Overview information not available."}
          </Typography>

          <Divider sx={{ marginBottom: 2, borderColor: "var(--text)" }} />

          <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: message.sender === "bot" ? "row" : "row-reverse",
                  marginBottom: 2,
                  fontFamily: "'Roboto', sans-serif",
                  boxShadow: 'none'
                }}
              >
                <Paper
                  sx={{
                    maxWidth: "55%",
                    padding: "0 1em",
                    backgroundColor: message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)",
                    borderRadius: 2,
                    boxShadow: 1,
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
            <Button variant="contained" sx={{ color: "#ffffff" }} onClick={handleSendMessage}>
              Send
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
