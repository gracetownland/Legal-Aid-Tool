import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack, Button, TextField, Snackbar, Alert, IconButton } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ReactMarkdown from "react-markdown";
import SendIcon from "@mui/icons-material/Send";
import FeedbackIcon from '@mui/icons-material/Feedback';
import NotFound from "../NotFound";

const CaseOverview = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedCase, setEditedCase] = useState({
    case_title: "",
    case_description: "",
    case_type: "",
    jurisdiction: "",
  });
  const [userRole, setUserRole] = useState("student"); 
  

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
        setSummaries(data.summaries);
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



  if (loading) {
    return <Typography align="center" mt={5}>Loading...</Typography>;
  }

  return (
    (caseData ? 
    <>
      <Stack minHeight="100vh">
        <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
          {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
        </Box>

        

        <Box display="flex" pt="80px">
          
          <SideMenu />
          <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
            


            {!caseData ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
                <Typography variant="h5" color="gray">No case data available</Typography>
              </Box>
            ) : (
              <>

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
                

                

                <Card sx={{ mb: 3, textAlign: "left", color: 'var(--text)', backgroundColor: "var(--background)", boxShadow: 'none', border: '1px solid var(--border)' }}>
                  <CardContent>
                    {editMode ? (
                      <>
                        <TextField
                          label="Case Title"
                          fullWidth
                          value={editedCase.case_title}
                          onChange={(e) => setEditedCase({ ...editedCase, case_title: e.target.value })}
                          sx={{
                            mb: 2,
                            '& .MuiInputBase-input': {
                              color: 'var(--text)', // input text
                            },
                            '& .MuiInputLabel-root': {
                              color: 'var(--text)', // label text
                            },
                            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)', // outline border
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)', // hover border
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)', // focused border
                            }
                          }}
                        />

                        <TextField
                          label="Case Description"
                          fullWidth
                          multiline
                          rows={4}
                          value={editedCase.case_description}
                          onChange={(e) => setEditedCase({ ...editedCase, case_description: e.target.value })}
                          sx={{
                            '& .MuiInputBase-input': {
                              color: 'var(--text)',
                            },
                            '& .MuiInputLabel-root': {
                              color: 'var(--text)',
                            },
                            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--text)',
                            }
                          }}
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

                <Stack direction="row" spacing={2} mb={3}>
  {userRole === "instructor" ? (
    <></>
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
      Send Case for Review
    </Button>
  )}
</Stack>

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
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>

    :

    <NotFound/> // Error handling page
  ));
};

export default CaseOverview;
