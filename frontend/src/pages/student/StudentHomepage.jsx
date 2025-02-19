import { useEffect, useState } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { ToastContainer } from "react-toastify";
import { Add, ArrowForward } from '@mui/icons-material';
import "react-toastify/dist/ReactToastify.css";
import { cardio } from 'ldrs'
cardio.register()

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
import dummyData from "./dummyData.json";

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
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    setGroups(dummyData); 
    setLoading(false); 
  }, []);

  const handleViewCase = (caseData) => {
    navigate("/case-overview", { state: { caseData } });
  };

  return (
    <ThemeProvider theme={theme}>
      <StudentHeader />
      <Container
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start", // Align left
          alignItems: "flex-start", // Align to the top
          width: "100%",
          maxWidth: "100%",
          pb: 0,
          gap: 2, // Add space between columns
        }}
      >
        {/* Left Column: Quick Links & Recent Activity */}
        <Box
          sx={{
            width: "20%", // You can adjust this to a bigger value like 25% or 30% as needed
            pr: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            textAlign: 'left',
            paddingLeft: 4,
          }}
        >
          {/* Quick Links Section */}
          <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>Quick Links</Typography>
          <Box sx={{ bgcolor: 'white', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button variant="contained" sx={{ height: 50, backgroundColor: theme.palette.primary.main }} onClick={() => { navigate('/new-case') }}>
              <Add sx={{ mr: 0 }} /> {/* Plus icon with margin right */}
            </Button>
            <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.primary }}>
              Start a new case
            </Typography>
          </Box>

          <Box sx={{ bgcolor: "white", borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button variant="contained" sx={{ height: 50, backgroundColor: theme.palette.primary.main }} onClick={() => { navigate('/cases') }}>
              <ArrowForward sx={{ mr: 0 }} /> {/* Arrow icon */}
            </Button>
            <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.primary }}>
              View All Cases
            </Typography>
          </Box>
        </Box>

        {/* Right Column: Cases */}
        <Box
          sx={{
            flex: 1, // Makes the right column take all remaining space
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
                <l-cardio size="50" stroke="4" speed="2" color="black"></l-cardio>
              </Box>
            ) : (
              <Box paddingLeft={3} paddingRight={3} sx={{ display: "flex", flexDirection: "column", alignItems: groups.length === 0 ? "center" : "flex-start", justifyContent: groups.length === 0 ? "center" : "flex-start", width: "100%", height: "calc(90vh - 100px)", overflowY: "auto", overflowX: "hidden" }}>
                {groups.length === 0 ? (
                  <Typography variant="body1" sx={{ color: theme.palette.text.primary, textAlign: "center", mt: 2, fontSize: "1.5rem" }}>
                    No cases yet, start a new one
                  </Typography>
                ) : (
                  <Grid container spacing={1} sx={{ width: "100%" }}>
                    {groups.map((group, index) => (
                      <Grid item xs={12} sm={7.5} md={4} key={index}>
                        <Card sx={{ mb: 2, borderRadius: 1, boxShadow: 2, transition: "transform 0.3s ease", "&:hover": { transform: "scale(1.05)" } }}>
                          <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                            {/* Case Title Box */}
                            <Box sx={{ borderRadius: 1, mb: 2, display: "flex", justifyContent: "flex-start", alignItems: "left" }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.25rem", textAlign: "left" }}>
                                {group.case_title}
                              </Typography>
                            </Box>

                            {/* Status Section */}
                            <Typography variant="body1" sx={{ textAlign: "left", fontWeight: 500, mb: 1, color: group.status === "review feedback" ? "green" : "grey" }}>
                              {group.status}
                            </Typography>

                            {/* Case Type & Last Updated */}
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 500 }}>
                              Case Type
                              <Typography variant="body2">{group.case_type}</Typography>
                            </Typography>
                            
                            <Typography variant="body2" sx={{ textAlign: "left", fontWeight: 500 }}>
                              Last Updated
                              <Typography variant="body2">{new Date(group.last_updated).toLocaleString()}</Typography>
                            </Typography>
                          </CardContent>

                          {/* View Case Button */}
                          <CardActions sx={{ justifyContent: "flex-end", mt: 2 }}>
                            <Button size="small" sx={{ bgcolor: theme.palette.primary.main, color: "white", fontWeight: "bold", ":hover": { bgcolor: theme.palette.primary.dark } }} onClick={() => handleViewCase(group)}>
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
