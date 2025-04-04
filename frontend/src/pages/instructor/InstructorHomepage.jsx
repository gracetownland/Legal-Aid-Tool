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
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" component="div">
                        {caseItem.case_title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
                        <strong>Submitted By:</strong> {caseItem.user_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
                        <strong>Last Updated:</strong> {new Date(caseItem.last_updated).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: "space-between" }}>
                      <Button
                                                        size="small"
                                                        sx={{
                                                          bgcolor: theme.palette.primary.main,
                                                          color: "white",
                                                          fontWeight: "bold",
                                                          ":hover": { bgcolor: theme.palette.primary.dark },
                                                        }}
                                                        onClick={() => handleViewCase(caseItem.case_id)}
                                                      >
                                                        View Case
                                                      </Button>
                      <Button size="small" color="secondary">
                        Review
                      </Button>
                    </CardActions>
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
