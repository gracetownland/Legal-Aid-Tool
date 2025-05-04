import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Dialog,
} from "@mui/material";
import InstructorHeader from "../../components/InstructorHeader";
import { useNavigate } from "react-router-dom";

const InstructorHomepage = () => {
  const [openStudentDialog, setOpenStudentDialog] = useState(false);
  const [submittedCases, setSubmittedCases] = useState([]);
  const [uniqueStudents, setUniqueStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmittedCases = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognito_id = session.tokens.idToken.payload.sub;
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}instructor/view_students?cognito_id=${encodeURIComponent(cognito_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          console.log(data);  // Log the data to see if it's in the expected format
          setSubmittedCases(data);
          
          // Create a unique list of students based on user_id
          const uniqueStudentsMap = new Map();
          data.forEach(item => {
            if (!uniqueStudentsMap.has(item.user_id)) {
              uniqueStudentsMap.set(item.user_id, {
                user_id: item.user_id,
                first_name: item.first_name,
                last_name: item.last_name,
                email: item.email
              });
            }
          });
          setUniqueStudents(Array.from(uniqueStudentsMap.values()));
        } else {
          console.error("Failed to fetch submitted cases:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching submitted cases:", error);
      }
    };
    
    fetchSubmittedCases();
  }, []);

  const handleViewCase = (caseId) => {
    navigate(`/case/${caseId}/overview`);
  };

  const navigateToFilteredCases = (status) => {
    navigate(`/all-cases?status=${encodeURIComponent(status)}`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        textAlign: "left",
      }}
    >
      {/* Fixed Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 1000,
          backgroundColor: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <InstructorHeader />
      </div>
      {/* Main Content */}
      <div style={{ marginTop: "80px", padding: "20px" }}>
        <Grid container spacing={3}>
          {/* Left Column: Analytics Panel */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    backgroundColor: "var(--background)",
                    color: "var(--text)",
                    boxShadow: "none",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.01)" },
                  }}
                  onClick={() => setOpenStudentDialog(true)} 
                >
                  <Typography variant="body2">Total Students Assigned</Typography>
                  <Typography variant="h6">
                    {uniqueStudents.length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2,  
                    backgroundColor: "var(--background)",
                    color: "var(--text)",
                    boxShadow: "none",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.01)" }
                  }}
                  onClick={() => navigateToFilteredCases("Sent to Review")}
                >
                  <Typography variant="body2">Cases To Review</Typography>
                  <Typography variant="h6">
                    {
                      submittedCases.filter((c) => c.status === "Sent to Review")
                        .length
                    }
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: "var(--background)",
                    color: "var(--text)",
                    boxShadow: "none",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": { transform: "scale(1.01)" }
                  }}
                  onClick={() => navigateToFilteredCases("Review Feedback")}
                >
                  <Typography variant="body2">Cases Reviewed</Typography>
                  <Typography variant="h6">
                    {
                      submittedCases.filter((c) => c.status === "Review Feedback")
                        .length
                    }
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
          {/* Right Column: Cases Cards */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography color="var(--text)" fontFamily="Outfit" fontWeight="bold" textAlign="left" variant="h6">
                Cases Submitted for Review
              </Typography>
            </Box>
            
            {submittedCases.filter((c) => c.status === "Sent to Review").length > 0 ? (
              <Grid container spacing={2} sx={{ padding: 0 }}>
                {submittedCases
                  .filter((caseItem) => caseItem.status === "Sent to Review")
                  .slice(0, 4) // Show only the first 4 cases
                  .map((caseItem, index) => (
                    <Grid item xs={12} sm={12} md={6} key={index}>
                      <Card
                        onClick={() => handleViewCase(caseItem.case_id)}
                        sx={{
                          cursor: "pointer",
                          transition: "transform 0.3s ease",
                          "&:hover": { transform: "scale(1.01)" },
                          backgroundColor: "var(--background)",
                          color: "var(--text)",
                          boxShadow: "none",
                          border: "1px solid var(--border)",
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                        }}
                      >
                        <CardContent
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            textAlign: "left",
                          }}
                        >
                          <Typography
                            sx={{
                              color: "grey",
                              fontSize: "0.85rem",
                              fontWeight: 500,
                            }}
                          >
                            Case #{caseItem.case_hash}
                          </Typography>
                          <Box
                            sx={{
                              mb: 2,
                              display: "flex",
                              justifyContent: "flex-start",
                              alignItems: "left",
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                fontSize: "1.25rem",
                              }}
                            >
                              {caseItem.case_title}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 500,
                              mb: 1,
                              color:
                                caseItem.status === "Review Feedback"
                                  ? "green"
                                  : "orange",
                            }}
                          >
                            {caseItem.status}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 400 }}>
                            <strong>Jurisdiction:</strong>{" "}
                            {Array.isArray(caseItem.jurisdiction)
                              ? caseItem.jurisdiction.join(", ")
                              : caseItem.jurisdiction}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 400 }}>
                            <strong>Student:</strong> {caseItem.first_name} {caseItem.last_name}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 400 }}>
                            <strong>Date Added:</strong>{" "}
                            {new Date(caseItem.last_updated).toLocaleString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true,
                              }
                            )}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            ) : (
              <Typography variant="body1" sx={{ textAlign: "center", mt: 2 }}>
                No cases submitted for review.
              </Typography>
            )}
          </Grid>
        </Grid>
      </div>
      
      {/* Dialog for displaying assigned students */}
      <Dialog
        open={openStudentDialog}
        onClose={() => setOpenStudentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Assigned Students</Typography>
          <Box sx={{ maxHeight: "300px", overflowY: "auto" }}>
            {uniqueStudents.map((student, idx) => (
              <Box key={idx} sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {student.first_name} {student.last_name} {student.email && `(${student.email})`}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box textAlign="right" sx={{ mt: 2 }}>
            <Button onClick={() => setOpenStudentDialog(false)} variant="outlined">Close</Button>
          </Box>
        </Box>
      </Dialog>
    </div>
  );
};

export default InstructorHomepage;