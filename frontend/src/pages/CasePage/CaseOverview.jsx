import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack, Button, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader"; // Add InstructorHeader import
import { fetchAuthSession } from "aws-amplify/auth";

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
  const [feedback, setFeedback] = useState(""); // State to manage feedback
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false); // State to show/hide feedback textbox

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

      // Fetch user role here
      const userRole = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student"; // Assuming the role is stored in the Cognito groups claim
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
        console.log(data);
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

      alert("Case sent for review successfully!");
    } catch (error) {
      console.error("Error sending case for review:", error);
      alert("Failed to send case for review.");
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
  
      alert("Case edited successfully!");
      setCaseData({ ...caseData, ...editedCase }); 
      setEditMode(false);
    } catch (error) {
      console.error("Error editing case:", error);
      alert("Failed to edit case.");
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
            message_content: feedback, // Pass the feedback message content as the message
          }),
        }
      );
  
      if (!response.ok) throw new Error("Failed to submit feedback");
  
      alert("Message sent successfully!");
      setFeedback(""); // Clear feedback field
      setIsFeedbackVisible(false); // Hide feedback textbox after submission
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback.");
    }
  };
  

  if (loading) {
    return <Typography align="center" mt={5}>Loading...</Typography>;
  }

  return (
    <Stack minHeight="100vh">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
        {/* Conditionally render the header based on user role */}
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

      <Box display="flex" pt="80px">
        <SideMenu />
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
        {userRole === "student" && (
          <Box sx={{ mb: 2, textAlign: "left" }}>
            <Typography variant="h6" fontWeight={600}>
              Feedback
            </Typography>
            {/* Map through the messages array */}
            {messages.length > 0 ? (
              messages.map((message) => (
                <Typography variant="body2" key={message.id} sx={{ mt: 1 }}>
                  {message.message_content} - Sent By Prajna
              </Typography>
              ))
            ) : (
              <Typography variant="body2" color="gray">
                No feedback available.
              </Typography>
            )}
          </Box>
        )}
          {!caseData ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
              <Typography variant="h5" color="gray">
                No case data available
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h4" fontWeight={600} mb={3} textAlign="left">
                Case #{caseData.case_hash}
              </Typography>

              <Stack direction="row" spacing={2} mb={3}>
                {userRole === "instructor" ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => setIsFeedbackVisible(!isFeedbackVisible)}
                  >
                    Send Feedback
                  </Button>
                ) : (
                  <Button variant="contained" color="secondary" onClick={handleSendForReview}>
                    Send For Review
                  </Button>
                )}

                {/* Edit Case Button - visible to both roles */}
  <Button
    variant="outlined"
    color="primary"
    onClick={() => setEditMode(!editMode)}
  >
    {editMode ? "Cancel Edit" : "Edit Case"}
  </Button>
              </Stack>

              {/* Conditionally show feedback textbox for instructors */}
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
                    <Button variant="contained" color="secondary" onClick={handleInstructorFeedbackSubmit}>
                      Submit Feedback
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card sx={{ mb: 3, textAlign: "left", color: 'var(--text)',backgroundColor: "var(--background3)", boxShadow: 'none', border: '1px solid var(--border)' }}>
                <CardContent>
                {editMode ? (
  <>
    <TextField
      label="Case Title"
      fullWidth
      value={editedCase.case_title}
      onChange={(e) =>
        setEditedCase({ ...editedCase, case_title: e.target.value })
      }
      sx={{ mb: 2 }}
    />
    <TextField
      label="Case Description"
      fullWidth
      multiline
      rows={4}
      value={editedCase.case_description}
      onChange={(e) =>
        setEditedCase({ ...editedCase, case_description: e.target.value })
      }
    />
  </>
) : (
  <>
    <Typography variant="h6">{caseData.case_title}</Typography>
    <Typography variant="body2">{caseData.case_description}</Typography>
  </>
)}

{editMode && (
  <Button
    variant="contained"
    color="success"
    sx={{ mt: 2 }}
    onClick={handleSaveEdit} 
  >
    Save Changes
  </Button>
)}


                </CardContent>
              </Card>

              <CardContent>
                <Grid container spacing={3} sx={{ textAlign: "left"}}>
                  {["case_type", "jurisdiction"].map((key, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Typography variant="h6" fontWeight={500}>
                        {key.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                      </Typography>
                      <Typography variant="body2">{caseData[key] || "N/A"}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={500}>
                      Status
                    </Typography>
                    <Typography variant="body2">{caseData.status || "N/A"}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={500}>
                      Last Updated
                    </Typography>
                    <Typography variant="body2">
                      {caseData.last_updated ? new Date(caseData.last_updated).toLocaleString() : "N/A"}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </>
          )}

          {/* AI Generated Summary Section */}
          {generatedSummary && (
            <Card sx={{ mt: 4 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={500} mb={2}>
                  AI Generated Summary
                </Typography>
                <Typography variant="body2">{generatedSummary}</Typography>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Stack>
  );
};

export default CaseOverview;
