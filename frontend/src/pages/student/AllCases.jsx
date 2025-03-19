import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Divider,
  CardActions,
  AppBar
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import StudentHeader from "../../components/StudentHeader";
import { ThemeProvider } from "@mui/material";
import theme from "../../theme";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const ViewAllCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCaseType, setSelectedCaseType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const session = await fetchAuthSession();
        const userAttributes = await fetchUserAttributes();
        const token = session.tokens.idToken;
        const cognito_id = session.tokens.idToken.payload.sub;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_cases?user_id=${cognito_id}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        setCases(data);
        setFilteredData(data); // Initialize filtered data
      } catch (error) {
        console.error("Error fetching cases:", error);
      }
    };

    fetchCases();
  }, []);

  // Update filtered data when filters or search term change
  useEffect(() => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(
        (caseData) =>
          caseData.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          caseData.case_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCaseType) {
      filtered = filtered.filter((caseData) => caseData.case_type === selectedCaseType);
    }

    if (selectedStatus) {
      filtered = filtered.filter((caseData) => caseData.status === selectedStatus);
    }

    setFilteredData(filtered);
  }, [cases, searchTerm, selectedCaseType, selectedStatus]);

  const handleViewCase = (caseData) => {
    navigate("/case/overview", { state: { caseData } });
  };

  const handleBack = () => {
    navigate("/home");
  };

  const caseTypes = [...new Set(cases.map((caseData) => caseData.case_type))];
  const statuses = [...new Set(cases.map((caseData) => caseData.status))];

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" color="primary" elevation={0}>
        <StudentHeader />
      </AppBar>
      <Container sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2, justifyContent: "center" }}>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%"}}>
        
      </Box>
        <Typography variant="h5" sx={{ mb: 1, textAlign: "left" }}>
          View All Cases
        </Typography>

        {/* Search and Filters Section */}
        <Box sx={{ mb: 1, display: "flex", gap: 2 }}>
          <TextField
            label="Search by Case Title or Description"
            fullWidth
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 1 }}
          />

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Case Type</InputLabel>
            <Select value={selectedCaseType} onChange={(e) => setSelectedCaseType(e.target.value)}>
              <MenuItem value="">All Case Types</MenuItem>
              {caseTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <MenuItem value="">All Statuses</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Case Cards Section */}
        <Grid container spacing={2}>
          {filteredData.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: "center", width: "100%" }}>
              No cases found
            </Typography>
          ) : (
            filteredData.map((caseItem, index, key) => (
              <Grid item xs={12} sm={7.5} md={4} key={index}>
                                      <Card sx={{ mb: 2, mt:2, transition: "transform 0.3s ease", "&:hover": { transform: "scale(1.05)" } }}>
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
            ))
          )}
        </Grid>
      </Container>
    </ThemeProvider>
  );
};

export default ViewAllCases;
