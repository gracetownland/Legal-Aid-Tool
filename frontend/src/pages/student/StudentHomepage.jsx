import { useEffect, useState } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { ToastContainer } from "react-toastify";
import { Add, ArrowForward } from '@mui/icons-material';
import "react-toastify/dist/ReactToastify.css";
import { ring } from 'ldrs'
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth'; 
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
  

  const handleViewCase = (caseData) => {
    navigate("/case/overview/*", { state: { caseData } });
  };

  return (
    <ThemeProvider theme={theme}>
      <StudentHeader />
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
        {/* Left Column: Quick Links & Recent Activity */}
        <Box
          sx={{
            width: "20%",
            pr: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            textAlign: 'left',
            paddingLeft: 4,
          }}
        >
          <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>Quick Links</Typography>
          <Box sx={{ bgcolor: 'white', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button variant="contained" sx={{ height: 50, backgroundColor: theme.palette.primary.main }} onClick={() => { navigate('/new-case') }}>
              <Add sx={{ mr: 0, color: 'white' }} />
            </Button>
            <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.primary }}>
              Start A New Case
            </Typography>
          </Box>

          <Box sx={{ bgcolor: "white", borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button variant="contained" sx={{ height: 50, backgroundColor: theme.palette.primary.main }} onClick={() => { navigate('/cases') }}>
              <ArrowForward sx={{ mr: 0 , color: 'white'}} />
            </Button>
            <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.primary }}>
              View All Cases
            </Typography>
          </Box>
        </Box>

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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", paddingLeft: 4, paddingRight: 5, mb: 2 }}>
              <Typography
                component="h1"
                variant="h5"
                color="black"
                sx={{
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "1.5rem",
                  color: theme.palette.text.primary,
                }}
                textAlign="left"
              >
                Cases
              </Typography>
            </Box>

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
                  <Grid container spacing={1} sx={{ width: "100%" }}>
                    {cases.map((caseItem, index) => (
                      <Grid item xs={12} sm={7.5} md={4} key={index}>
                        <Card sx={{ mb: 2, borderRadius: 1, boxShadow: 2, transition: "transform 0.3s ease", "&:hover": { transform: "scale(1.05)" } }}>
                          <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                            {caseItem.case_title}
                            <Box sx={{ borderRadius: 1, mb: 2, display: "flex", justifyContent: "flex-start", alignItems: "left" }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.25rem", textAlign: "left" }}>
                                {caseItem.case_title}
                              </Typography>
                            </Box>

                            {/* Status Section */}
                            <Typography variant="body1" sx={{ textAlign: "left", fontWeight: 500, mb: 1, color: caseItem.status === "Review Feedback" ? "green" : "grey" }}>
                              {caseItem.status}
                            </Typography>

                            {/* Case Type & Last Updated */}
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 500 }}>
                              Case Type
                              <Typography variant="body2">{caseItem.law_type}</Typography>
                            </Typography>
                            
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 500 }}>
                              Status
                              <Typography variant="body2">{caseItem.status}In Progress</Typography>
                            </Typography>
                          </CardContent>

                          {/* View Case Button */}
                          <CardActions sx={{ justifyContent: "flex-end", mt: 2 }}>
                            <Button size="small" sx={{ bgcolor: theme.palette.primary.main, color: "white", fontWeight: "bold", ":hover": { bgcolor: theme.palette.primary.dark } }} onClick={() => handleViewCase(caseItem)}>
                              View Case
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
