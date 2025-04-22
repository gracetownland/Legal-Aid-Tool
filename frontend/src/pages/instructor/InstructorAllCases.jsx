import React, { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InstructorHeader from "../../components/InstructorHeader";
import { useNavigate, useLocation } from "react-router-dom";

const AllCasesPage = () => {
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract query parameters if any
    const queryParams = new URLSearchParams(location.search);
    const statusParam = queryParams.get("status");
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [location]);

  useEffect(() => {
    const fetchAllCases = async () => {
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
          setAllCases(data);
          
          // Extract unique students from cases
          const uniqueStudents = Array.from(
            new Set(data.map(item => item.user_id))
          ).map(userId => {
            const student = data.find(item => item.user_id === userId);
            return {
              user_id: userId,
              name: `${student.first_name} ${student.last_name}`
            };
          });
          
          setStudents(uniqueStudents);
        } else {
          console.error("Failed to fetch cases:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching cases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCases();
  }, []);

  useEffect(() => {
    // Filter cases based on search term, status filter, and student filter
    const filtered = allCases.filter((caseItem) => {
      const matchesSearch = 
        caseItem.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.case_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${caseItem.first_name} ${caseItem.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(caseItem.jurisdiction) 
          ? caseItem.jurisdiction.some(j => j.toLowerCase().includes(searchTerm.toLowerCase()))
          : caseItem.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter;
      const matchesStudent = studentFilter === "all" || caseItem.user_id === studentFilter;
      
      return matchesSearch && matchesStatus && matchesStudent;
    });
    
    setFilteredCases(filtered);
  }, [searchTerm, statusFilter, studentFilter, allCases]);

  const handleViewCase = (caseId) => {
    navigate(`/case/${caseId}/overview`);
  };

  // Get unique statuses for filter dropdown
  const statuses = ["all", ...new Set(allCases.map(item => item.status))];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", textAlign: "left" }}>
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

      {/* Content */}
      <div style={{ marginTop: "80px", padding: "20px" }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          All Cases
        </Typography>

        {/* Search and Filter Bar */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 3, 
            display: "flex", 
            gap: 2, 
            flexDirection: { xs: "column", sm: "row" },
            flexWrap: { sm: "wrap" },
            alignItems: "center",
            backgroundColor: "var(--background)"
          }}
        >
          <TextField
            label="Search cases"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 2, minWidth: { xs: "100%", sm: "200px" } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl variant="outlined" sx={{ minWidth: { xs: "100%", sm: "200px" }, flex: 1 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === "all" ? "All Statuses" : status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: { xs: "100%", sm: "200px" }, flex: 1 }}>
            <InputLabel id="student-filter-label">Student</InputLabel>
            <Select
              labelId="student-filter-label"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              label="Student"
            >
              <MenuItem value="all">All Students</MenuItem>
              {students.map((student) => (
                <MenuItem key={student.user_id} value={student.user_id}>
                  {student.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : filteredCases.length === 0 ? (
          <Typography variant="body1" sx={{ mt: 2, textAlign: "center" }}>
            {allCases.length === 0 ? "No cases available." : "No cases match your search criteria."}
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredCases.map((caseItem, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  onClick={() => handleViewCase(caseItem.case_id)}
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.01)" },
                    backgroundColor: "var(--background)",
                    color: "var(--text)",
                    boxShadow: "none",
                    border: "1px solid var(--border)",
                    height: "100%",
                  }}
                >
                  <CardContent sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography
                      sx={{
                        color: "grey",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                      }}
                    >
                      Case #{caseItem.case_hash}
                    </Typography>

                    <Box
                      sx={{
                        mb: 2,
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "left",
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.25rem",
                        }}
                      >
                        {caseItem.case_title}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 500,
                        mb: 1,
                        color:
                          caseItem.status === "Review Feedback"
                            ? "green"
                            : caseItem.status === "Sent to Review"
                            ? "orange"
                            : "grey",
                      }}
                    >
                      {caseItem.status}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 400 }}>
                      <strong>Jurisdiction:</strong>{" "}
                      {Array.isArray(caseItem.jurisdiction)
                        ? caseItem.jurisdiction.join(", ")
                        : caseItem.jurisdiction}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 400 }}>
                      <strong>Student:</strong> {caseItem.first_name} {caseItem.last_name}
                    </Typography>

                    <Typography variant="body2" sx={{ fontWeight: 400 }}>
                      <strong>Date Added:</strong>{" "}
                      {new Date(caseItem.last_updated).toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
};

export default AllCasesPage;