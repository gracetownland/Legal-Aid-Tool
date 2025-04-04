import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack, Button, TextField, Snackbar, Alert } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';

const CaseOverview = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedCase, setEditedCase] = useState({
    case_title: "",
    case_description: "",
    case_type: "",
    jurisdiction: "",
  });
  const [userRole, setUserRole] = useState("student"); 
  const [feedback, setFeedback] = useState("");
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (caseData) {
      setEditedCase({
        case_title: caseData.case_title,
        case_description: caseData.case_description,
        case_type: caseData.case_type,
        jurisdiction: caseData.jurisdiction,
      });
    }
  }, [caseData]);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!caseId) return;

      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const userRole = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
      setUserRole(userRole);

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
        setCaseData(data.caseData);
        setMessages(data.messages);
      } catch (error) {
        console.error("Error fetching case data:", error);
        setCaseData(null);
      } finally {
        setLoading(false);
      }
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

  const handleSaveEdit = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/edit_case?case_id=${caseId}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedCase), 
        }
      );

      if (!response.ok) throw new Error("Failed to update case");

      setSnackbar({ open: true, message: "Case edited successfully!", severity: "success" });
      setCaseData({ ...caseData, ...editedCase }); 
      setEditMode(false);
    } catch (error) {
      console.error("Error editing case:", error);
      setSnackbar({ open: true, message: "Failed to edit case.", severity: "error" });
    }
  };

  const handleInstructorFeedbackSubmit = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const instructorId = token.payload.sub;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}instructor/edit_patient?case_id=${caseId}&instructor_id=9c7db538-2001-70b6-af47-6ecfd6bf9ad1`,
        {
          method: "PUT",
          headers: {
            Authorization: `${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_content: feedback,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to submit feedback");

      setSnackbar({ open: true, message: "Message sent successfully!", severity: "success" });
      setFeedback("");
      setIsFeedbackVisible(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSnackbar({ open: true, message: "Failed to submit feedback.", severity: "error" });
    }
  };

  if (loading) {
    return <Typography align="center" mt={5}>Loading...</Typography>;
  }

  return (
    <>
      <Stack minHeight="100vh">
        <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
          {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
        </Box>

        

        <Box display="flex" pt="80px">
          
          <SideMenu />
          <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
            
            {/* Feedback Section */}
            {userRole === "student" && (
              <Box sx={{ mb: 2, textAlign: "left", border: "1px solid var(--border)", borderRadius: 2, padding: 2 }}>
                <Typography variant="h6" fontWeight={600}>Feedback</Typography>
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <div>
                    <Typography variant="body2" key={message.id} sx={{ mt: 1, border: "1px solid var(--border)", padding: 1, borderRadius: 2 }}>
                      {message.message_content}
                    </Typography>
                    <Typography variant="body2" key={message.id} sx={{ mt: 1 }}>
                    Sent By: Prajna Nayak
                  </Typography>
                  </div>
                  ))
                ) : (
                  <Typography variant="body2" color="gray">No feedback available.</Typography>
                )}
              </Box>
            )}

            {!caseData ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
                <Typography variant="h5" color="gray">No case data available</Typography>
              </Box>
            ) : (
              <>
                

                <Stack direction="row" spacing={2} mb={3}>
                  {userRole === "instructor" ? (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => setIsFeedbackVisible(!isFeedbackVisible)}
                    >
                      {messages.length !== 0 ? "Update Feedback" : "Send Feedback"}
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleSendForReview}
                    >
                      {messages.length !== 0 ? "Send Case For Additional Review" : "Send Case For Review"}
                    </Button>
                  )}
                </Stack>

                <Divider sx={{ mb: 3, borderColor: "var(--border)"}} />

                <div style={{ display: "flex", alignItems: "center", marginBottom: "1em", gap: "1em" }}>
                <Typography variant="h4" fontWeight={600} mb={0} textAlign="left">
                  Case #{caseData.case_hash}
                </Typography>

                <div
                  onClick={() => setEditMode(!editMode)}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {editMode ? (
                    <EditOffIcon
                      style={{
                        fontSize: '32px',
                        transform: 'scaleX(1)',
                      }}
                    />
                  ) : (
                    <EditIcon
                      style={{
                        fontSize: '32px',
                        transform: 'scaleX(1)',
                      }}
                    />
                  )}
                </div>

                </div>
                

                {isFeedbackVisible && userRole === "instructor" && (
                  <Card sx={{ mb: 3, padding: 2 }}>
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
                      <Button variant="contained" color="primary" onClick={handleInstructorFeedbackSubmit}>
                        Submit Feedback
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card sx={{ mb: 3, textAlign: "left", color: 'var(--text)', backgroundColor: "var(--background3)", boxShadow: 'none', border: '1px solid var(--border)' }}>
                  <CardContent>
                    {editMode ? (
                      <>
                        <TextField
                          label="Case Title"
                          fullWidth
                          value={editedCase.case_title}
                          onChange={(e) => setEditedCase({ ...editedCase, case_title: e.target.value })}
                          sx={{ mb: 2 }}
                        />
                        <TextField
                          label="Case Description"
                          fullWidth
                          multiline
                          rows={4}
                          value={editedCase.case_description}
                          onChange={(e) => setEditedCase({ ...editedCase, case_description: e.target.value })}
                        />
                        <Button variant="contained" color="success" sx={{ mt: 2 }} onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6">{caseData.case_title}</Typography>
                        <Divider sx={{ my: 2, borderColor: "var(--border)" }} />
                        <Typography variant="body2">{caseData.case_description}</Typography>
                      </>
                    )}
                  </CardContent>
                </Card>

                <CardContent>
                  <Grid container spacing={3} sx={{ textAlign: "left" }}>
                    {["case_type", "jurisdiction"].map((key, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Typography variant="h6" fontWeight={500}>
                          {key.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                        </Typography>
                        <Typography variant="body2">
                          {key === "jurisdiction" && caseData[key] ? (
                            Array.isArray(caseData[key])
                              ? caseData[key].join(", ")
                              : (caseData[key].match(/[A-Z][a-z\s]+/g) || [caseData[key]]).join(", ")
                          ) : (
                            caseData[key] || "N/A"
                          )}
                        </Typography>
                      </Grid>
                    ))}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" fontWeight={500}>Status</Typography>
                      <Typography variant="body2">{caseData.status || "N/A"}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" fontWeight={500}>Last Updated</Typography>
                      <Typography variant="body2">
                        {new Date(caseData.last_updated).toLocaleString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: 'numeric', hour12: true
                        })}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>

                {generatedSummary && (
                  <Card sx={{ mt: 4 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={500} mb={2}>AI Generated Summary</Typography>
                      <Typography variant="body2">{generatedSummary}</Typography>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </Container>
        </Box>
      </Stack>

      {/* Snackbar for alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CaseOverview;
