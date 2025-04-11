import React, { useEffect, useState } from "react";
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

const FeedbackPage = () => {
  const { caseId } = useParams();
  const [userRole, setUserRole] = useState("student");
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

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
      console.log("messages: ", data.messages[0].message_content);
    };

    fetchCaseData();
  }, [caseId]);

  const handleSendForReview = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const cognito_id = token.payload.sub;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/review_case?case_id=${caseId}&cognito_id=${cognito_id}`, {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) throw new Error("Failed to send for review");

      setSnackbar({ open: true, message: "Case sent for review successfully!", severity: "success" });
    } catch (error) {
      console.error("Error sending case for review:", error);
      setSnackbar({ open: true, message: "Failed to send case for review.", severity: "error" });
    }
  };

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
      setFeedback("");
      setIsFeedbackVisible(false);
    } catch {
      setSnackbar({ open: true, message: "Failed to submit feedback.", severity: "error" });
    }
  };

  return (
    <>
     
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000}>
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

 
      <Box display="flex" pt="80px" minHeight="100vh">
        <SideMenu />

        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto", textAlign: "left" }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>Feedback</Typography>

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
                  <Box key={msg.id} mb={2}>
                    <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{msg.message_content}</Typography>
                    <Typography variant="caption" color="#808080">
                      Sent by: {msg.first_name} {msg.last_name}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="#808080">No feedback available.</Typography>
              )}
            </Box>
          )}


<Stack direction="row" spacing={2} mb={3}>
  {userRole === "instructor" ? (
    <Button
      variant="contained"
      color="secondary"
      startIcon={<FeedbackIcon />}
      onClick={() => setIsFeedbackVisible(!isFeedbackVisible)}
      sx={{
        fontFamily: 'Inter',
        textTransform: "none",
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
    <Button
      variant="contained"
      color="primary"
      startIcon={<SendIcon />}
      onClick={handleSendForReview}
      sx={{
        textTransform: "none",
        fontFamily: 'Inter',
        fontWeight: 450,
        px: 3,
        color: "white",
        backgroundColor: "var(--secondary)",
        "&:hover": {
          backgroundColor: "var(--primary)",
        },
        py: 1.5,
        borderRadius: 10,
        transition: "0.2s ease",
        boxShadow: "none",
        "&:hover": {
          boxShadow: "0px 2px 10px rgba(0,0,0,0.15)",
          transform: "translateY(-1px)"
        }
      }}
    >
      {messages.length > 0 ? "Send Case for Additional Review" : "Send Case for Review"}
    </Button>
  )}
</Stack>


          {isFeedbackVisible && userRole === "instructor" && (
            <Card sx={{ maxWidth: 600 }}>
              <CardContent>
                <TextField
                  label="Your Feedback"
                  fullWidth
                  multiline
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" onClick={handleSubmitFeedback}>Submit Feedback</Button>
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
  );
};

export default FeedbackPage;
