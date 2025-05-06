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
import Chip from "@mui/material/Chip";

const CaseOverview = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [instructors, setInstructors] = useState([]);
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
        case_type: caseData.case_type,
        case_description: caseData.case_description,
        status: caseData.status,
        jurisdiction: caseData.jurisdiction,
        province: caseData.province,
        statute: caseData.statute,
      });
    }
  }, [caseData]);

  useEffect(() => {
    const fetchCaseData = async () => {
      if (!caseId) return;

      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const cognito_id = token.payload.sub;
      const userRole = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
      setUserRole(userRole);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}&cognito_id=${cognito_id}`,
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

  
    useEffect(() => {
      const fetchInstructors = async () => {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognitoId = token.payload.sub;
  
        const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/instructors?user_id=${cognitoId}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        });
        if (!res.ok) {
          console.error("Failed to fetch instructors:", res.statusText);
          return;
        }

        const data = await res.json();
        setInstructors(data || []);
        
      };
  
      fetchInstructors();
    }, [caseId]);


  const handleSaveEdit = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      console.log("Edited case: ", editedCase)

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/edit_case?case_id=${encodeURIComponent(caseId)}`,
        {
            method: "PUT",
            headers: {
                Authorization: token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(editedCase),
        })

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "row" }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: "1em", fontFamily: "Outfit", fontSize: '20pt', marginBottom: '0.5rem', fontWeight: '600' }}>Case Details</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "1em" }}>
                

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
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5em', alignItems: 'center'}}>
                    
                    <EditOffIcon
                      style={{
                        fontSize: '25px',
                        transform: 'scaleX(1)',
                      }}
                    />
                    <p>Cancel Edit Case</p>
                    </div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'row', gap: '0.5em', alignItems: 'center'}}>
                    
                    <EditIcon
                      style={{
                        fontSize: '25px',
                        transform: 'scaleX(1)',
                      }}
                    />
                    <p>Edit Case</p>
                    </div>
                  )}
                </div>
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
                              borderColor: 'var(--border)', // outline border
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--border)', // hover border
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--border)', // focused border
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
                              borderColor: 'var(--border)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--border)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'var(--border)',
                            }
                          }}
                        />
                        <Button variant="contained" color="success" sx={{ mt: 2, boxShadow: 'none', borderRadius: '2em', textTransform: 'none', fontFamily: 'Outfit' }} onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexDirection: "row" }}>
                        <Typography variant="h6" style={{fontFamily: "Outfit"}}>{caseData.case_title}</Typography>
                        <Typography variant="h7" style={{fontFamily: "Outfit", color: "var(--placeholder-text)"}} fontWeight={100} mb={0} textAlign="left">
                          Case #{caseData.case_hash}
                        </Typography>
                        </div>
                        <Divider sx={{ my: 2, borderColor: "var(--border)" }} />
                        <Typography variant="body2" sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                          {caseData.case_description}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Stack direction="row" spacing={2} mb={3}>
  {userRole === "instructor" ? (
    <></>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "left", gap: "1em" }}>
      <div>
      The instructor(s) currently able to review your case are: {(instructors.length === 0) ? "None" : instructors.map((instructor, index) => (
      <Chip
        key={index}
        label={`${instructor.instructor_name}`}
        sx={{
          backgroundColor: "var(--background2)",
          color: "var(--text)",
          fontFamily: "Outfit",
          fontWeight: 500,
          borderRadius: 10,
          transition: "0.2s ease",
          ml: 1,
        }}
      />
    ))}
    </div>
    <Button
      variant="contained"
      color="primary"
      startIcon={<SendIcon />}
      onClick={handleSendForReview}
      disabled={caseData.status === "Sent to Review" || instructors.length === 0}
      sx={{
        textTransform: "none",
        fontFamily: 'Inter',
        fontWeight: 450,
        px: 3,
        color: "white",
        width: "fit-content",
        backgroundColor: "var(--secondary)",
        py: 1.5,
        borderRadius: 10,
        transition: "0.2s ease",
        boxShadow: "none",
        "&:hover": {
          boxShadow: "none",
          backgroundColor: "var(--primary)",
        }
      }}
    >
      Send Case for Review
    </Button>
    </div>
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
                              ? caseData[key]
                                  .map(j => j === "Provincial" ? `Provincial (${caseData.province})` : j)
                                  .join(", ")
                              : caseData[key] === "Provincial"
                                ? `Provincial (${caseData.province})`
                                : caseData[key]
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
