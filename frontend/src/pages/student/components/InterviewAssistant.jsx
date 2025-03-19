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
  
    useEffect(() => {
      const fetchCaseData = async () => {
  
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
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
          setCaseData(data);
        } catch (error) {
          console.error("Error fetching case data:", error);
          setCaseData(null);
        } finally {
          setLoading(false);
        }
      };
  
      fetchCaseData();
    }, [caseId]);

  const handleBack = () => {
    navigate("/"); // Navigate to the homepage
  };
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi, I'm your Legal Interview Assistant. Try asking me to analyze the case to begin!" },
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
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InterviewAssistant;