import { useEffect, useState, useContext } from "react";
import StudentHeader from "../../components/StudentHeader";
import Container from "../Container";
import { fetchAuthSession } from "aws-amplify/auth";

import { ToastContainer, toast } from "react-toastify";
import { Add, ArrowForward } from '@mui/icons-material';
import "react-toastify/dist/ReactToastify.css";

// pulse for loading animation
import { cardio } from 'ldrs'
cardio.register()

// MUI
import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography,
  Box,
  Grid,
  Stack,
  Skeleton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Navigate, useNavigate } from "react-router-dom";
import { UserContext } from "../../App";

// MUI theming
const { palette } = createTheme();
    
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

function titleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export const StudentHomepage = ({ setGroup }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  return (
    <ThemeProvider theme={theme}>
      <StudentHeader />
      <Container
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "80%",
          maxWidth: "100%",
          pb: 0,
        }}
      >
        
        {/* Left Column: Quick Links & Recent Activity */}
        
        <Grid item xs={3} sx={{ pr: 2, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', paddingLeft: 4}}>
          {/* Quick Links Section */}
          <Typography variant="h6">Quick Links</Typography>
          <Box sx={{ bgcolor: "#fff", borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button
              variant="contained"
              sx={{ height: 50 }}

              onClick={() => { navigate('/new-case')}}
            >
            <Add sx={{mr: 0 }} /> {/* Plus icon with margin right */}
            </Button>
            <Typography variant="text" sx={{ mr: 2, justifyContent: 'center'}}>Start a new case</Typography>
          </Box>

          <Box sx={{ bgcolor: "#fff", borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50 }}>
            <Button
              variant="contained"
              sx={{ height: 50 }}
            >
            <ArrowForward sx={{mr: 0 }} /> {/* Plus icon with margin right */}
            </Button>
            <Typography variant="text" sx={{ mr: 2, justifyContent: 'center'}}>View All Cases</Typography>
          </Box>

          {/* Recent Activity Section */}
          
          <Typography variant="h6">Recent Activity</Typography>
          <Box sx={{ bgcolor: "#fff", p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Supervisor sent feedback on case #1356.
            </Typography>
          </Box>
          <Box sx={{ bgcolor: "#fff", p: 2, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Supervisor sent feedback on case #1356.
            </Typography>
          </Box>
        </Grid>

        {/* Right Column: Groups / Cases */}
        <Grid item xs={9}>
          <Stack
            sx={{
              flex: 1,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%", // Full width for consistent alignment
                paddingLeft: 4,
                paddingRight: 5,
                mb: 2,
              }}
            >
              <Typography
                component="h1"
                variant="h5"
                color="black"
                sx={{
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "1.5rem",
                }}
                textAlign="left"
              >
                Cases
              </Typography>
              
            </Box>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80vh",
                  width: "100%",
                }}
              >
                <l-cardio
                  size="50" // pulse for loading animation  
                  stroke="4"
                  speed="2"
                  color="Black" 
                ></l-cardio>
              </Box>
            ) : (
              <Box
                paddingLeft={3}
                paddingRight={3} // Added paddingRight
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: groups.length === 0 ? "center" : "flex-start",
                  justifyContent: groups.length === 0 ? "center" : "flex-start",
                  width: "100%",
                  height: "calc(90vh - 100px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {groups.length === 0 ? (
                  <Typography
                    variant="body1"
                    sx={{
                      color: "black",
                      textAlign: "center",
                      mt: 2,
                      fontSize: "1.5rem",
                    }}
                  >
                    No cases yet, start a new one 
                  </Typography>
                ) : (
                  <Grid container spacing={2} sx={{ width: "100%" }}>
                    {groups.map((group, index) => (
                      <Grid item xs={4} key={index}>
                        <Card
                          sx={{
                            mb: 1,
                            bgcolor: "transparent",
                            background: "#99DFB2",
                            transition: "transform 0.3s ease",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          <CardContent>
                            <Typography
                              variant="h6"
                              sx={{
                                textAlign: "left",
                                fontWeight: "600",
                                fontSize: "1.25rem",
                              }}
                            >
                              {titleCase(group.group_name)}
                            </Typography>
                          </CardContent>
                          <CardActions sx={{ justifyContent: "flex-end" }}>
                            <Button
                              size="small"
                              sx={{
                                bgcolor: "#e3f7f1",
                                color: "black",
                                fontWeight: "dark",
                                ":hover": { bgcolor: "grey" },
                              }}
                            >
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
         
          </Grid>
      </Container>

      {/* Toast notifications */}
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </ThemeProvider>
  );
};

export default StudentHomepage;
