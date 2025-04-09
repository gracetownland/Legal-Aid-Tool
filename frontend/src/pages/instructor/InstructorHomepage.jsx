import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Menu, 
} from "@mui/material";
import InstructorHeader from "../../components/InstructorHeader";
import theme from "../../Theme"; 
import { Navigate, useNavigate } from "react-router-dom";

const InstructorHomepage = () => {
  const [submittedCases, setSubmittedCases] = useState([]);
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
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" , textAlign: "left"}}>
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
        <Typography color="black" fontWeight="bold" textAlign="left" variant="h6">
          Cases Submitted for Review
        </Typography>
          {submittedCases.length > 0 ? (
            <Grid container spacing={2} sx={{ padding: 2 }}>
              {submittedCases.map((caseItem, index) => (
                <Grid item xs={12} sm={7.5} md={4} key={index}>
                                            <Card
                                              onClick={(event) => {
                                                  handleViewCase(caseItem.case_id); 
                                              }} // Ensure it doesn't trigger for the button or when the menu is open
                                              sx={{
                                                cursor: "pointer",
                                                mb: 2,
                                                mt: 2,
                                                transition: "transform 0.3s ease",
                                                "&:hover": { transform: "scale(1.01)" },
                                                backgroundColor: "var(--background)",
                                                color: "var(--text)",
                                                boxShadow: "none",
                                                border: "1px solid var(--border)",
                                                display: "flex",
                                                flexDirection: "column",
                                                height: "90%",
                                              }}
                                            >
                                              <CardContent
                                                sx={{
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  height: "100%",
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
                                                      textAlign: "left",
                                                    }}
                                                  >
                                                    {caseItem.case_title}
                                                  </Typography>
                                                </Box>
                
                                                {/* Status Section */}
                                                <Typography
                                                  variant="body1"
                                                  sx={{
                                                    textAlign: "left",
                                                    fontWeight: 500,
                                                    mb: 1,
                                                    color:
                                                      caseItem.status === "Review Feedback"
                                                        ? "green"
                                                        : "grey",
                                                  }}
                                                >
                                                  {caseItem.status}
                                                </Typography>
                
                                                {/* Case Type & Last Updated */}
                                                <Typography
                                                  variant="body2"
                                                  sx={{ textAlign: "left", fontWeight: 400 }}
                                                >
                                                  <strong>Jurisdiction:</strong>{" "}
                                                  {Array.isArray(caseItem.jurisdiction)
                                                  ? caseItem.jurisdiction.join(", ")
                                                  : caseItem.jurisdiction}
                                                </Typography>

                                                <Typography
              variant="body2"
              sx={{ textAlign: "left", fontWeight: 400 }}
            >
              <strong>Student:</strong> {caseItem.student_name}
            </Typography>
                
                                                <Typography
                                                  variant="body2"
                                                  sx={{ textAlign: "left", fontWeight: 400 }}
                                                >
                                                  <strong>Date Added:</strong>{" "}
                                                  {new Date(caseItem.last_updated).toLocaleString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric', 
                                                    year: 'numeric', 
                                                    hour: 'numeric', 
                                                    minute: 'numeric', 
                                                    hour12: true, // Use 12-hour clock (e.g., 'AM')
                                                  })}
                                                </Typography>
                                              </CardContent>
                
                                            </Card>
                                          </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" sx={{ textAlign: "center", marginTop: 2 }}>
              No cases submitted for review.
            </Typography>
          )}
      </div>
    </div>
  );
};

export default InstructorHomepage;
