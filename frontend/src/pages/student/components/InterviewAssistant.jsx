import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper, Divider } from "@mui/material";

const InterviewAssistant = ({ caseData }) => {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm your Interview Assistant. Let's get started." },
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

  async function getAIResponse(userInput) {
<<<<<<< HEAD
    return userInput; // stub for AI response
=======
    async function getFetchBody() {
      try {
        const response = await fetch('https://1xojcaj3t8.execute-api.ca-central-1.amazonaws.com/Test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queryStringParameters: {},  // Empty query string parameters (if not used)
            body: JSON.stringify({
              "message_content": "My landlord won't return my calls about the broken heater."
            })
          }),
          mode: 'no-cors'  // Add this line to set the request mode to no-cors
        })
        .then(response => response.json())
        .then(data => console.log('Success:', data))
        .catch((error) => console.error('Error:', error));

        // With no-cors, you can't access the response body directly
        // if (!response.ok) {
        //   throw new Error('Network response was not ok ' + response.statusText);
        // }
  
        // You won't be able to read response.json() with no-cors, so this part won't work as expected
        console.log('Success:', response); // You'll only be able to log the response as opaque
  
        // Since no-cors means you can't access the body, we can't directly extract the body.
        // Returning null here.
        return null;
  
      } catch (error) {
        console.error('Error:', error);  // Log any error that occurs
        return null;  // Return null in case of an error
      }
    }
  
    // Calling the function and logging the result
    const body = await getFetchBody();
    console.log("Extracted Body:", body);  // Log the extracted body after it's returned
>>>>>>> 4d74cb07b3e8100a837ea26f71f9a046ba674923
  }
  

  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 2 }}>
      {/* Case Title and Information */}
      <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: 2 }}>
        {caseData?.case_title || "Case Title Not Available"}
      </Typography>
      <Typography variant="body2" sx={{ marginBottom: 2 }}>
        <strong>Case Overview:</strong> {caseData?.case_description || "Overview information not available."}
      </Typography>

      <Divider sx={{ marginBottom: 2 }} />

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
        <Button variant="contained"  sx={{ color: "#ffffff"}} onClick={handleSendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;
