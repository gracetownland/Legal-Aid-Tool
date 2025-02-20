import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper } from "@mui/material";
import axios from "axios";

const InterviewAssistant = () => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm your Interview Assistant. Let's get started." },
  ]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (userInput.trim()) {
      // Add user's message to the chat
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
      ]);

      // Reset user input
      setUserInput("");

      // Show loading state
      setLoading(true);

      try {
        // Call API Gateway (which triggers Lambda)
        const response = await axios.post("https://2n2g0poiyl.execute-api.ca-central-1.amazonaws.com/dev", {
          user_prompt: userInput, // send user input as the prompt
          number_of_docs: 3, // you can modify this value based on your needs
        });

        // Add the bot's response to the chat
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: response.data.answer }, // Assuming the response data contains 'answer'
        ]);
      } catch (error) {
        console.error("Error while fetching answer:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: "Sorry, I encountered an error. Please try again later." },
        ]);
      } finally {
        // Hide loading state
        setLoading(false);
      }
    }
  };

  async function getAIResponse(userInput) {
    return userInput // stub      
  }

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
        <Button variant="contained" color="primary" onClick={handleSendMessage} disabled={loading}>
          {loading ? "Loading..." : "Send"}
        </Button>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
