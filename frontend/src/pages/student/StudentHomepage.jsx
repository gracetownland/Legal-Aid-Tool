import { useEffect, useState } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { ToastContainer } from "react-toastify";
import { Add, ArrowForward } from '@mui/icons-material';
import "react-toastify/dist/ReactToastify.css";
import { ring } from 'ldrs'
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth'; 
import {AppBar} from "@mui/material";
ring.register()

import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  Stack,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// MUI theming
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#546bdf',
      contrastText: '#050315',
    },
    secondary: {
      main: '#c5d6f0',
      contrastText: '#050315',
    },
    divider: '#1c187a',
    text: {
      primary: 'rgb(5, 3, 21)',
      secondary: 'rgba(5, 3, 21, 0.6)',
      disabled: 'rgba(5, 3, 21, 0.38)',
      hint: 'rgb(28, 24, 122)',
    },
    background: {
      default: '#fbfbfe',
    },
  },
});

export const StudentHomepage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState([]);
  const [error, setError] = useState(null); // For handling any errors during fetch

  useEffect(() => {
      const fetchCases = () => {
        fetchAuthSession()
          .then((session) => {
            return fetchUserAttributes().then((userAttributes) => {
              const token = session.tokens.idToken;
              const cognito_id = session.tokens.idToken.payload.sub;
              return fetch(
                `${
                  import.meta.env.VITE_API_ENDPOINT
                }student/get_cases?user_id=${cognito_id}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: token,
                    "Content-Type": "application/json",
                  },
                }
              );
            });
          })
          .then((response) => response.json())
          .then((data) => {
            setCases(data);
            setLoading(false);
            console.log(data);
          })
          .catch((error) => {
            console.error("Error fetching name:", error);
          });
      };


      
  
      fetchCases();
    }, []);
  

  const handleViewCase = (caseId) => {
    navigate(`/case/${caseId}/overview`);
  };

  const handleDeleteCase = async (caseId) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const cognito_id = session.tokens.idToken.payload.sub
  
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/delete_case?case_id=${caseId}&cognito_id=${cognito_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        throw new Error("Failed to delete the case");
      }
  
      // Remove deleted case from state
      setCases((prevCases) => prevCases.filter((caseItem) => caseItem.case_id !== caseId));
    } catch (error) {
      console.error("Error deleting case:", error);
    }
  };
  

  return (
    <ThemeProvider theme={theme}>
       <AppBar position="static" color="primary">
        <StudentHeader />
      </AppBar>
      <Container
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          width: "100%",
          maxWidth: "100%",
          pb: 0,
          gap: 2,
        }}
      >

        {/* Right Column: Cases */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            paddingLeft: 3,
            paddingRight: 3,
          }}
        >
          <Stack sx={{ flex: 1, width: "100%" }}>
           

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", width: "100%" }}>
                <l-ring size="50" stroke="4" speed="2" color="black"></l-ring>
              </Box>
            ) : error ? (
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Typography variant="h6" sx={{ color: "red" }}>
                  {error}
                </Typography>
              </Box>
            ) : (
              <Box paddingLeft={3} paddingRight={3} sx={{ display: "flex", flexDirection: "column", alignItems: cases.length === 0 ? "center" : "flex-start", justifyContent: cases.length === 0 ? "center" : "flex-start", width: "100%", height: "calc(90vh - 100px)", overflowY: "auto", overflowX: "hidden" }}>
                {cases.length === 0 ? (
                  <Typography variant="body1" sx={{ color: theme.palette.text.primary, textAlign: "center", mt: 2, fontSize: "1.5rem" }}>
                    No cases yet, start a new one
                  </Typography>
                ) : (
                  <Grid container spacing={1} sx={{ width: "100%" , marginTop: '100px' }}>
                    {cases.map((caseItem, index) => (
                      <Grid item xs={12} sm={7.5} md={4} key={index}>
                        <Card sx={{ mb: 2, mt:2, transition: "transform 0.3s ease", "&:hover": { transform: "scale(1.01)" } }}>
                          <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%", textAlign: "left" }}>
                            <Typography sx={{color: 'grey',  fontSize: "0.85rem", fontWeight: 500}}>Case #{caseItem.case_hash}</Typography>
                            
                            <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start", alignItems: "left" }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.25rem", textAlign: "left" }}>
                                {caseItem.case_title}
                              </Typography>
                            </Box>

                            {/* Status Section */}
                            <Typography variant="body1" sx={{ textAlign: "left", fontWeight: 500, mb: 1, color: caseItem.status === "Review Feedback" ? "green" : "grey" }}>
                              {caseItem.status}
                            </Typography>

                            {/* Case Type & Last Updated */}
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 400 }}>
                            <strong>Jurisdiction:</strong> {caseItem.law_type}
                            </Typography>
                            
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 400 }}>
                            <strong>Date Added:</strong> { new Date(caseItem.last_updated).toLocaleString()}
                            </Typography>
                          </CardContent>

                          {/* View Case Button */}
                          <CardActions sx={{ justifyContent: "space-between", mt: 2 }}>
  <Button
    size="small"
    sx={{ bgcolor: theme.palette.primary.main, color: "white", fontWeight: "bold", ":hover": { bgcolor: theme.palette.primary.dark } }}
    onClick={() => handleViewCase(caseItem.case_id)}
  >
    View Case
  </Button>

  <Button
    size="small"
    sx={{ bgcolor: "red", color: "white", fontWeight: "bold", ":hover": { bgcolor: "darkred" } }}
    onClick={() => handleDeleteCase(caseItem.case_id)}
  >
    Delete
  </Button>
</CardActions>

                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Stack>
        </Box>
      </Container>

      <ToastContainer />
    </ThemeProvider>
  );
};

export default StudentHomepage;
