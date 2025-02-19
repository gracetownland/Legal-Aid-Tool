import React, { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Grid, MenuItem, Select, FormControl, InputLabel, Card, CardContent, Divider } from '@mui/material';
import dummyData from './dummyData.json'; // Import the dummy data
import StudentHeader from '../../components/StudentHeader';
import { ThemeProvider } from '@mui/material';
import theme from '../../Theme';

const ViewAllCases = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filteredData, setFilteredData] = useState(dummyData);

  // Handle Search Change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle Filter Change for Case Type
  const handleCaseTypeChange = (e) => {
    setSelectedCaseType(e.target.value);
  };

  // Handle Filter Change for Status
  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
  };

  // Function to apply filters and search
  const applyFilters = () => {
    let filtered = dummyData;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (caseData) =>
          caseData.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          caseData.case_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by Case Type
    if (selectedCaseType) {
      filtered = filtered.filter(
        (caseData) => caseData.case_type === selectedCaseType
      );
    }

    // Filter by Status
    if (selectedStatus) {
      filtered = filtered.filter(
        (caseData) => caseData.status === selectedStatus
      );
    }

    // Update the filtered data state
    setFilteredData(filtered);
  };

  // Filter options
  const caseTypes = [...new Set(dummyData.map((caseData) => caseData.case_type))];
  const statuses = [...new Set(dummyData.map((caseData) => caseData.status))];

  return (
    <ThemeProvider theme={theme}>
    <StudentHeader />
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start", // Align to the top
        width: "100%",
        maxWidth: "100%",
        pb: 0,
        gap: 2, // Add space between columns
      }}
    > 
      <Typography variant="h5" sx={{ mb: 3 }}>
        View All Cases
      </Typography>

      {/* Search and Filters Section */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2}}>
        {/* Search Bar */}
        <TextField
          label="Search by Case Title or Description"
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flex: 1 }}
        />

        {/* Case Type Filter */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Case Type</InputLabel>
          <Select
            value={selectedCaseType}
            onChange={handleCaseTypeChange}
            label="Case Type"
          >
            <MenuItem value="">All Case Types</MenuItem>
            {caseTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status Filter */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            label="Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Apply Filters Button */}
        <Button variant="contained" onClick={applyFilters}>
          Apply Filters
        </Button>
      </Box>

      {/* Case Cards Section */}
      <Grid container spacing={2}>
        {filteredData.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', width: '100%' }}>
            No cases found
          </Typography>
        ) : (
          filteredData.map((caseData, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: '600' }}>
                    {caseData.case_title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Case Type:</strong> {caseData.case_type}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Status:</strong> {caseData.status}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Law Types:</strong> {caseData.law_type.join(', ')}
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
