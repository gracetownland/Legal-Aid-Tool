import React, { useEffect, useState, useRef } from "react";
import {
  Box, Typography, Button, Stack, TextField, Card, CardContent, Snackbar, Alert, Container
} from "@mui/material";
import { useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import SendIcon from "@mui/icons-material/Send";
import FeedbackIcon from '@mui/icons-material/Feedback';
import Divider from "@mui/material/Divider";
import NotFound from "../NotFound";

const FeedbackPage = () => {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState({});
  const [userRole, setUserRole] = useState("student");
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const messageRefs = useRef({});

  const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const fetchCaseData = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const group = token.payload["cognito:groups"]?.[0] || "student";
      setUserRole(group);

      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}`, {
        headers: { Authorization: token, "Content-Type": "application/json" },
      });

      const data = await res.json();
      setMessages(data.messages || []);
      setCaseData(data.caseData || {});
      console.log("messages: ", data.messages[0].message_content);
    };

    fetchCaseData();
  }, [caseId]);


  useEffect(() => {
    if (!messages.length) return;
  
    const timeoutMap = new Map();
    
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const messageId = entry.target.dataset.messageId;
  
          // If it's visible and the tab is active
          if (entry.isIntersecting && document.visibilityState === "visible") {
            const timeoutId = setTimeout(() => {
              if (
                entry.isIntersecting &&
                document.visibilityState === "visible"
              ) {
                console.log(`Message ${messageId} has been in view for 2 seconds`);
                
                
                readMessage(messageId);

              }
            }, 2000);
  
            timeoutMap.set(messageId, timeoutId);
            entry.target.dataset.timeoutId = timeoutId;
          } else {
            // Clear if they scrolled away or tab is hidden
            const id = timeoutMap.get(messageId);
            if (id) clearTimeout(id);
          }
        });
      },
      { threshold: 1.0 }
    );
  
    messages.forEach((msg) => {
      const el = messageRefs.current[msg.message_id];
      if (el) {
        el.dataset.messageId = msg.message_id;
        observer.observe(el);
      }
    });

    const readMessage = async (messageId) => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        fetch(`${import.meta.env.VITE_API_ENDPOINT}student/read_message?message_id=${messageId}`, {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Error reading message:", error);
      }
    }
  
    // Listen for tab switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        for (const id of timeoutMap.values()) {
          clearTimeout(id);
        }
      }
    };
  
    document.addEventListener("visibilitychange", handleVisibilityChange);
  
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      for (const id of timeoutMap.values()) {
        clearTimeout(id);
      }
    };
  }, [messages]);


  const handleSubmitFeedback = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const instructorId = token.payload.sub;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}instructor/send_feedback?case_id=${caseId}&instructor_id=${instructorId}`,
        {
          method: "PUT",
          headers: { Authorization: token, "Content-Type": "application/json" },
          body: JSON.stringify({ message_content: feedback }),
        }
      );

      if (!response.ok) throw new Error();
      setSnackbar({ open: true, message: "Feedback submitted!", severity: "success" });
      window.location.reload();
      setFeedback("");
    } catch {
      setSnackbar({ open: true, message: "Failed to submit feedback.", severity: "error" });
    }
  };

  return (
    (caseData ?
    <>
     
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000}>
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

 
      <Box display="flex" pt="80px" minHeight="100vh">
        <SideMenu />

        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto", textAlign: "left" }}>
          <div>
          <Typography variant="h4" fontWeight={600} fontFamily="Outfit">Feedback</Typography>
          <Typography variant="h4" fontWeight={400} fontFamily="Outfit" fontSize={20} mb={1} textAlign="left">
                        For Case: "{caseData.case_title}"
          </Typography>
                        </div>
          {userRole === "student" && (
            <Box
              sx={{
                mb: 3,
                border: "1px solid var(--border)",
                borderRadius: 2,
                p: 2,
                backgroundColor: "#var(--background)",
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <Box key={msg.message_id} ref={(el)=>(messageRefs.current[msg.message_id] = el)} mb={2} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0px", backgroundColor: "var(--background)" }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="var(--text)" pt={1} pl={1} pr={1} pb={0.5}>
                      From: {msg.first_name} {msg.last_name}
                    </Typography>
                    <Typography variant="caption" color="var(--text)" pt={1} pl={1} pr={1} pb={0.5}>
                    {new Date(msg.time_sent).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}, {" "}
                     
                    {new Date(msg.time_sent).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })} 
                    </Typography>
                    
                    </Stack>
                    <Divider sx={{ borderColor: "var(--border)", width: '100%' }} />
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", padding: '10px' }}>{msg.message_content}</Typography>
                    
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="#808080">No feedback available.</Typography>
              )}
            </Box>
          )}





          {userRole === "instructor" && (
            <Card sx={{ backgroundColor: 'var(--background)', borderRadius: 2, boxShadow: 'none', border: '1px solid var(--border)' }}>
              <Box
  sx={{
    m: 3,
    border: "1px solid var(--border)",
    borderRadius: 2,
    p: 2,
    backgroundColor: "var(--background)",
  }}
>
  <Typography variant="h6" fontWeight={500} mb={2} color="var(--text)" fontFamily="Outfit">Previous Feedback</Typography>
  {messages.length > 0 ? (
    messages.map((msg) => (
      <Box key={msg.id} mb={2}>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{msg.message_content}</Typography>
        <Typography variant="caption" color="#808080">
          Sent by: {msg.first_name} {msg.last_name}
        </Typography>
        {msg.is_read && (
      <Typography variant="caption" color="green" fontStyle="italic" ml={1}>
        ✅ Read
      </Typography>
    )}
      </Box>
    ))
  ) : (
    <Typography variant="body2" color="#808080">No feedback sent yet.</Typography>
  )}
</Box>

              <CardContent sx={{m: 1, color: 'var(--text)'}}>
              <p>Send your students feedback on this case here. They will be able to see your name.</p>
                <TextField
                  placeholder="Your Feedback"
                  fullWidth
                  multiline
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  sx={{ my: 2, 
                    overflow: "auto",
                    "& .MuiOutlinedInput-root": {
                      color: "var(--text)",
                      "& fieldset": {
                        borderColor: "var(--border)",
                      },
                      "&:hover fieldset": {
                        borderColor: "var(--border)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--border)",
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "var(--text)",
                    },
                  }}    
                />
                <Stack direction="row" spacing={2} mb={3}>
  {userRole === "instructor" ? (
    <Button
      variant="contained"
      color="secondary"
      startIcon={<FeedbackIcon />}
      onClick={handleSubmitFeedback}
      sx={{
        fontFamily: 'Inter',
        textTransform: "none",
        backgroundColor: "var(--secondary)",
        color: "white",
        fontWeight: 450,
        px: 3,
        py: 1.5,
        borderRadius: 2,
        transition: "0.2s ease",
        boxShadow: "none",
        "&:hover": {
          boxShadow: "0px 2px 10px rgba(0,0,0,0.15)",
          transform: "translateY(-1px)"
        }
      }}
    >
      {messages.length > 0 ? "Update Feedback" : "Send Feedback"}
    </Button>
  ) : (
    <></>
  )}
</Stack>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        variant='filled'
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }} variant='filled'>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>

    :

    <NotFound/>)
  );
};

export default FeedbackPage;
