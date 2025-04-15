import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  AppBar,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MoreHoriz } from "@mui/icons-material";
import StudentHeader from "../../components/StudentHeader";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#546bdf',
      contrastText: '#050315',
    },
    background: {
      default: 'var(--background)',
    },
    text: {
      primary: 'rgb(5, 3, 21)',
    },
  },
});

const ViewAllCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognito_id = token.payload.sub;

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
        if (response.status === 404) {
          setCases([]);
          return;
        }
        setCases(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error fetching cases:", error);
      }
    };

    fetchCases();
  }, []);

  useEffect(() => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(
        (caseData) =>
          caseData.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          caseData.case_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredData(filtered);
  }, [cases, searchTerm]);

  const handleMenuClick = (event, caseId) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCaseId(caseId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCaseId(null);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCaseId(null);
  };

  const handleDeleteCase = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const cognito_id = token.payload.sub;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/delete_case?case_id=${selectedCaseId}&cognito_id=${cognito_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      setCases((prev) => prev.filter((c) => c.case_id !== selectedCaseId));
      handleCloseDialog();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleViewCase = (caseId) => {
    navigate(`/case/${caseId}/overview`);
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" color="primary" elevation={0}>
        <StudentHeader />
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          View All Cases
        </Typography>

        <TextField
          label="Search by Case Title or Description"
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: 'var(--text)',
              '& fieldset': {
                borderColor: 'var(--border)',
              },
              '&:hover fieldset': {
                borderColor: 'var(--border)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--border)',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'var(--text)',
            },
          }}
        />

        <Grid container spacing={2}>
          {filteredData.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: "center", width: "100%", color: "grey" }}>
              No cases found
            </Typography>
          ) : (
            filteredData.map((caseItem, index) => (
              <Grid item xs={12} sm={7.5} md={4} key={index}>
                <Card
                  onClick={() => handleViewCase(caseItem.case_id)}
                  sx={{
                    cursor: "pointer",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.01)" },
                    background: 'none',
                    color: "var(--text)",
                    boxShadow: "none",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                >
                  <CardContent sx={{ textAlign: "left" }}>
                    <Typography sx={{ color: "grey", fontSize: "0.85rem", fontWeight: 500 }}>
                      Case #{caseItem.case_hash}
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                      {caseItem.case_title}
                    </Typography>

                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 500,
                        mt: 1,
                        mb: 1,
                        color: caseItem.status === "Review Feedback" ? "orange" : (caseItem.status === "Sent to Review" ? "var(--feedback)" : "var(--text-secondary)"),
                      }}
                    >
                      {caseItem.status}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Jurisdiction:</strong>{" "}
                      {Array.isArray(caseItem.jurisdiction)
                        ? caseItem.jurisdiction.join(", ")
                        : caseItem.jurisdiction}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Date Added:</strong>{" "}
                      {new Date(caseItem.last_updated).toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true,
                      })}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ justifyContent: "flex-end" }}>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, caseItem.case_id)}
                      sx={{ color: "gray", position: "absolute", bottom: 0, right: 0, ":hover": { background: "none" } }}
                    >
                      <MoreHoriz />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Container>

      {/* Delete confirmation dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Delete Case</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this case? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleDeleteCase} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* 3-dot menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleOpenDialog}>Delete</MenuItem>
      </Menu>
    </ThemeProvider>
  );
};

export default ViewAllCases;
