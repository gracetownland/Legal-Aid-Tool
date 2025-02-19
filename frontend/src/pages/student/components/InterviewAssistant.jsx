import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper, Grid, Divider } from "@mui/material";

const InterviewAssistant = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm your Interview Assistant. Let's get started." },
  ]);
  const [userInput, setUserInput] = useState("");

  const handleSendMessage = () => {
    if (userInput.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text: userInput },
        { sender: "bot", text: "Got it! What's next?" }, // Bot response
      ]);
      setUserInput(""); // Reset input field
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ textAlign: "left", fontWeight: 600 }}>
        Interview Assistant
      </Typography>

      {/* Chat Messages */}
      <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              flexDirection: message.sender === "bot" ? "row" : "row-reverse",
              marginBottom: 2,
            }}
          >
            <Paper
              sx={{
                maxWidth: "100%",
                padding: 2,
                backgroundColor: message.sender === "bot" ? "#e7f7ff" : "#f1f1f1",
                borderRadius: 2,
                boxShadow: 1,
                marginLeft: message.sender === "bot" ? 0 : "auto",
                marginRight: message.sender === "bot" ? "auto" : 0,
              }}
            >
              <Typography variant="body1" sx={{ textAlign: "left" }}>
                {message.text}
              </Typography>
            </Paper>
          </Box>
        ))}
      </Box>

      {/* User Input Field */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <TextField
          label="Your Answer"
          variant="outlined"
          fullWidth
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          sx={{ marginRight: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleSendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
