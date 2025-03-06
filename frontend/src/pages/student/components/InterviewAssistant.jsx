import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper, Divider, useTheme } from "@mui/material";

const InterviewAssistant = ({ caseData }) => {
  const theme = useTheme();
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, I'm your Legal Interview Assistant. Let's get started!" },
  ]);
  const [userInput, setUserInput] = useState("");

  const handleSendMessage = async () => {
    if (userInput.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text: userInput },
      ]);
      setUserInput(""); // Reset input field

      // Await the AI response before updating the messages
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
      handleSendMessage()
    }
  }

  async function getAIResponse(userInput) {
    async function getFetchBody() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/text_generation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message_content: userInput
          })
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        const data = await response.json();
        const res = data.llm_output
        console.log('Success:', data);
        return res;
      } catch (error) {
        console.error('Error:', error);
        return null;
      }
    }
  
    const body = await getFetchBody();
    return body
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
      <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
        {caseData?.case_title || "Case Title Not Available"}
      </Typography>
      <Typography variant="body2" sx={{ marginBottom: 2 }}>
        <strong>Case Overview:</strong> {caseData?.case_description || "Overview information not available."}
      </Typography>

      <Divider sx={{ marginBottom: 2, borderColor: "var(--text)"}} />

      <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              flexDirection: message.sender === "bot" ? "row" : "row-reverse",
              marginBottom: 2,
              fontFamily: "'Roboto', sans-serif"
            }}
          >
            <Paper
              sx={{
                maxWidth: "100%",
                padding: 2,
                backgroundColor: message.sender === "bot" ? "var(--bot-text)" : "var(--sender-text)",
                borderRadius: 2,
                boxShadow: 1,
                marginLeft: message.sender === "bot" ? 0 : "auto",
                marginRight: message.sender === "bot" ? "auto" : 0,
                color: "var(--text)",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              <Typography variant="body1" sx={{ textAlign: "left" }}>
                <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "var(--font-family)"}}>{message.text}</pre>
              </Typography>
            </Paper>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center" }}>
        <TextField
          label="Your Answer"
          variant="outlined"
          fullWidth
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          sx={{ marginRight: 2 }}
          onKeyDown={handleKeyPress}
          InputLabelProps={{
            style: { backgroundColor: "transparent",
              color: "var(--text)" },
          }}
          InputProps={{
            style: {
              backgroundColor: "transparent",
              color: "var(--text)",
            },
          }}
        />
        <Button variant="contained" sx={{ color: "#ffffff" }} onClick={handleSendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
