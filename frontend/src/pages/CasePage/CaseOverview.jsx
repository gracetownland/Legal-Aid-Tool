import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack, Button, TextField } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import { fetchAuthSession } from "aws-amplify/auth";

const CaseOverview = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatedSummary, setGeneratedSummary] =  useState("");

  const [editMode, setEditMode] = useState(false);
  const [editedCase, setEditedCase] = useState({
    case_title: "",
    case_description: "",
    case_type: "",
    jurisdiction: "",
  });

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

  if (loading) {
    return <Typography align="center" mt={5}>Loading...</Typography>;
  }

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

  const handleEditCase = () => {
    setEditMode(true);
  };

  const handleSaveChanges = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      console.log(editedCase);
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/edit_case?case_id=${caseId}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            case_type: editedCase.case_type,
            jurisdiction: editedCase.jurisdiction,
            case_title: editedCase.case_title,
            case_description: editedCase.case_description,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save changes");

      // Only update the case data locally, excluding status
      alert("Case updated successfully!");
      setCaseData({
        case_title: editedCase.case_title,
        case_description: editedCase.case_description,
        case_type: editedCase.case_type,
        jurisdiction: editedCase.jurisdiction,
        status: caseData.status, 
        last_updated: new Date().toISOString(),
      });

      setEditMode(false);
    } catch (error) {
      console.error("Error updating case:", error);
      alert("Failed to save changes.");
    }
  };

  // Function to generate AI Summary (mockup)
  const handleGenerateSummary = async () => {
    try {
      // Assuming you have an endpoint that generates AI summary for the case description
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/summary_generation?case_id=${caseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to generate summary");

      const summary = await response.json();
      console.log(response);
      setGeneratedSummary(summary.summary); 
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary.");
    }
  };

  return (
    <Stack minHeight="100vh">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white" >
        <StudentHeader />
      </Box>

      <Box display="flex" pt="80px">
        <SideMenu />
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
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
                {editMode ? (
                  <Button variant="contained" color="success" onClick={handleSaveChanges}>
                    Save Changes
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" onClick={handleEditCase} sx={{ color: "white" }}>
                    Edit Case
                  </Button>
                )}
                <Button variant="contained" color="secondary" onClick={handleSendForReview}>
                  Send For Review
                </Button>
                <Button variant="contained" color="primary" onClick={handleGenerateSummary} sx={{ color: "white" }}>
                  Generate Summary
                </Button>
              </Stack>

              <Card sx={{ mb: 3, textAlign: "left", color: 'var(--text)',backgroundColor: "var(--background3)", boxShadow: 'none', border: '1px solid var(--border)' }}>
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
          sx={{ mb: 2 }}
        />
      </>
    ) : (
      <>
        <Typography variant="h6">{caseData.case_title}</Typography>
        <Typography variant="body2">{caseData.case_description}</Typography>
      </>
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
                      {editMode ? (
                        <TextField
                          fullWidth
                          value={editedCase[key] || ""}
                          onChange={(e) => setEditedCase({ ...editedCase, [key]: e.target.value })}
                        />
                      ) : (
                        <Typography variant="body2">{caseData[key] || "N/A"}</Typography>
                      )}
                    </Grid>
                  ))}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight={500}>
                      Status
                    </Typography>
                    <Typography variant="body2">{caseData.status || "N/A"}</Typography> {/* Display Status only, no editing */}
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
                </Card>)}
        </Container>
      </Box>
    </Stack>
  );
};

export default CaseOverview;
