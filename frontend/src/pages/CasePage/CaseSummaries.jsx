import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import { marked } from "marked";
import CloseIcon from "@mui/icons-material/Close";
import DOMPurify from "dompurify";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const SummariesPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [summaries, setSummaries] = useState([]);
  const [userRole, setUserRole] = useState("student");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const openMenu = Boolean(anchorEl);

  const getSummaries = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const role = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
    setUserRole(role);
  
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}`,
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
      setSummaries(
        data.summaries.sort(
          (a, b) => new Date(b.time_created) - new Date(a.time_created)
        )
      );
      setCaseData(data.caseData);
      console.log(data)
    } catch (error) {
      console.error("Error fetching case summaries:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getSummaries();
  }, [caseId]);
    

  const handleView = (summary) => {
    setSelectedSummary(summary);
    setViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedSummary(null);
  };

  const handleGenerateSummary = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/summary_generation?case_id=${caseId}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to generate summary");

      // refresh
      window.location.reload();
    } catch (error) {
      console.error("Error generating summary:", error);
    }
  };

  const handleDownload = (summary) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let y = margin;

    doc.setFontSize(12);
    y += 10;

    doc.text("Content:", margin, y);
    y += 10;

    doc.text(`Summary ID: ${summary.summary_id}`, margin, y);

    const content = marked.parse(summary.content).replace(/<[^>]+>/g, "");
    const lines = doc.splitTextToSize(content, 180);

    for (let i = 0; i < lines.length; i++) {
      if (y + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines[i], margin, y);
      y += 7;
    }

    doc.text(`Time Created: ${new Date(summary.time_created).toLocaleString()}`, margin, y + 10);

    doc.save(
      `summary-${new Date(summary.time_created).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })}.pdf`
    );
  };

  const handleMenuOpen = (event, summaryId) => {
    setAnchorEl(event.currentTarget);
    setSelectedSummaryId(summaryId);
    console.log(summaryId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSummaryId(null);
  };

  const handleDelete = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/delete_summary?summary_id=${selectedSummaryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete summary");
      await getSummaries();
      setSummaries((prev) => prev.filter((s) => s.id !== selectedSummaryId));
    } catch (error) {
      console.error("Error deleting summary:", error);
    } finally {
      setConfirmDeleteOpen(false);
      handleMenuClose();
    }
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

      <Box display="flex" pt="80px">
        <SideMenu />
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
          <Stack minHeight="100vh">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            {caseData && (
  <Typography variant="h4" fontWeight={600} mb={0} textAlign="left">
    Case #{caseData.case_hash}
  </Typography>
)}
            </Stack>

            {summaries.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaries.map((summary) => (
                      <TableRow key={summary.summary_id}>
                        <TableCell>
                          {new Date(summary.time_created).toLocaleString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              variant="outlined"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleDownload(summary)}
                            >
                              Download
                            </Button>
                            <Button variant="outlined" onClick={() => handleView(summary)}>
                              View
                            </Button>
                            <IconButton onClick={(e) => handleMenuOpen(e, summary.summary_id)}>
                              <MoreVertIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="gray">
                No summaries available.
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            setConfirmDeleteOpen(true);
           // handleMenuClose();
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} direction="row" justifyContent="flex-end" mt={2}>
            <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button color="error" onClick={handleDelete}>
              Delete
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseView} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 6 }}
        >
          <Typography variant="h6" fontWeight={600}>
            Summary Preview
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(selectedSummary)}
            >
              Download
            </Button>
            <IconButton
              aria-label="close"
              onClick={handleCloseView}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {selectedSummary ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(selectedSummary.content)),
              }}
            />
          ) : (
            <Typography variant="body2">No content available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SummariesPage;
