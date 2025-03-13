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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import StudentHeader from "../../components/StudentHeader";
import { ThemeProvider } from "@mui/material";
import theme from "../../Theme";
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
      <StudentHeader />
      <Container sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 2, justifyContent: "center" }}>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", mt: 2, mb: 2 }}>
        <Button 
          onClick={handleBack} 
          sx={{ width: "280px" }}
        >
          Back to Home Page
        </Button>
      </Box>
        <Typography variant="h5" sx={{ mb: 3 }}>
          View All Cases
        </Typography>

        {/* Search and Filters Section */}
        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
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
            filteredData.map((caseData, index, key) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: "100%", cursor: "pointer" }} onClick={() => handleViewCase(caseData)}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: "600" }}>
                      {caseData.case_title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Case Type:</strong> {caseData.case_type}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Status:</strong> In Progress
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Law Types:</strong> {caseData.law_type.join(", ")}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2">{caseData.case_description}</Typography>
                  </CardContent>
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
