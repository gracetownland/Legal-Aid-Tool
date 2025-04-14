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
  styled,
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

// Styled component for markdown content with proper heading styles
const StyledMarkdownContent = styled('div')(({ theme }) => ({
    '& h1:first-of-type': {
      fontSize: '2rem', // Larger than the regular h1 size
      fontWeight: 700,
      marginBottom: theme.spacing(2.5),
      marginTop: theme.spacing(2),
      color: theme.palette.primary.main,
      borderBottom: `2px solid ${theme.palette.primary.main}`,
      paddingBottom: theme.spacing(1.5)
    },
    '& h1:not(:first-of-type)': {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: theme.typography.h4.fontWeight,
      marginBottom: theme.spacing(2),
      marginTop: theme.spacing(2),
      color: theme.palette.primary.main,
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingBottom: theme.spacing(1)
    },
  '& h2': {
    fontSize: theme.typography.h5.fontSize,
    fontWeight: theme.typography.h5.fontWeight,
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    color: theme.palette.text.primary
  },
  '& h3': {
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.h6.fontWeight,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    color: theme.palette.text.primary
  },
  '& h4': {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    color: theme.palette.text.secondary
  },
  '& h5': {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: theme.spacing(0.75),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary
  },
  '& h6': {
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontStyle: 'italic'
  },
  '& p': {
    marginBottom: theme.spacing(1.5),
    lineHeight: 1.6
  },
  '& ul, & ol': {
    marginBottom: theme.spacing(2),
    paddingLeft: theme.spacing(3)
  },
  '& li': {
    marginBottom: theme.spacing(0.5)
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.grey[300]}`,
    paddingLeft: theme.spacing(2),
    fontStyle: 'italic',
    margin: theme.spacing(1, 0),
    color: theme.palette.text.secondary
  },
  '& code': {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(0.25, 0.5),
    borderRadius: '3px',
    fontSize: '0.9em'
  },
  '& pre': {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1.5),
    borderRadius: '4px',
    overflowX: 'auto',
    marginBottom: theme.spacing(2)
  },
  '& pre code': {
    padding: 0,
    backgroundColor: 'transparent'
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    marginBottom: theme.spacing(2)
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.75, 1)
  },
  '& th': {
    backgroundColor: theme.palette.grey[100],
    fontWeight: theme.typography.fontWeightMedium
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto'
  }
}));

// Configure marked renderer for custom heading rendering
const configureMarkedRenderer = () => {
  const renderer = new marked.Renderer();
  
  renderer.heading = (text, level) => {
    const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
    return `
      <h${level} id="${escapedText}" class="markdown-heading markdown-heading-${level}">
        ${text}
      </h${level}>
    `;
  };
  
  marked.use({ renderer });
};

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
  
  // Configure marked renderer on component initialization
  useEffect(() => {
    configureMarkedRenderer();
  }, []);
  
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
    
    // Parse the markdown to get structured content
    const htmlContent = marked.parse(summary.content);
    
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);
    
    // Extract headings and content
    const elements = Array.from(tempDiv.children);
    
    // Set document title as summary date instead of ID
    const formattedDate = new Date(summary.time_created).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Summary: ${formattedDate}`, margin, y);
    y += 15;
    
    // Process each element
    elements.forEach(element => {
      // Check for page break
      if (y + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      
      // Handle different heading levels with bold text
      if (element.tagName === 'H1') {
        if (element.textContent.includes('Case Summary')) {
          // First heading - make it larger
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold'); // Explicitly set bold
          doc.setTextColor(0, 0, 150); // Primary color
        } else {
          // Other h1 headings
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold'); // Explicitly set bold
          doc.setTextColor(0, 0, 0);
        }
        doc.text(element.textContent, margin, y);
        y += 10;
      } else if (element.tagName === 'H2') {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold'); // Explicitly set bold
        doc.text(element.textContent, margin, y);
        y += 8;
      } else if (element.tagName === 'H3' || element.tagName === 'H4') {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold'); // Explicitly set bold
        doc.text(element.textContent, margin, y);
        y += 7;
      } else if (element.tagName === 'P') {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal'); // Reset to normal for paragraph text
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(element.textContent, 180);
        lines.forEach(line => {
          if (y + 7 > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 7;
        });
        y += 3;
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const items = Array.from(element.children);
        items.forEach((item, index) => {
          if (y + 7 > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          const prefix = element.tagName === 'OL' ? `${index + 1}. ` : '• ';
          const lines = doc.splitTextToSize(prefix + item.textContent, 175);
          lines.forEach((line, lineIndex) => {
            const indent = lineIndex === 0 ? 0 : 5;
            doc.text(line, margin + indent, y);
            y += 7;
          });
        });
        y += 3;
      }
    });
    
    // Add creation time at the bottom
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, y + 10);
    
    doc.save(`summary-${formattedDate.replace(/[/:\\]/g, '-')}.pdf`);
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
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="var(--background)">
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
              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: "var(--background)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 2,
                  boxShadow: "none",
                }}
              >
                <Table sx={{ borderCollapse: "collapse" }}>
                  <TableHead>
                    <TableRow sx={{ borderBottom: "1px solid var(--border)" }}>
                      <TableCell
                        sx={{
                          color: "var(--text)",
                          borderBottom: "1px solid var(--border)",
                          width: "100%",
                        }}
                      >
                        Time Created
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid var(--border)" }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaries.map((summary) => (
                      <TableRow
                        key={summary.summary_id}
                        sx={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <TableCell sx={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
                          {new Date(summary.time_created).toLocaleString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(summary)}
                            sx={{
                              textTransform: "none",
                              backgroundColor: "var(--secondary)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "var(--primary)",
                              },
                              boxShadow: "none", // Optional: removes default MUI shadow
                              borderRadius: 2, // Optional: for consistent button shape
                              fontFamily: "Outfit", // Optional: if you're using this font
                            }}
                          >
                            Download
                          </Button>
                            <Button variant="contained" 
                            sx={{
                              backgroundColor: "var(--secondary)",
                              color: "white",
                              textTransform: "none",
                              "&:hover": {
                                backgroundColor: "var(--primary)",
                              },
                              boxShadow: "none", // Optional: removes default MUI shadow
                              borderRadius: 2, // Optional: for consistent button shape
                              fontFamily: "Outfit", // Optional: if you're using this font
                            }}
                            onClick={() => handleView(summary)}>
                              View
                            </Button>
                            <IconButton sx={{color: "var(--text)"}} onClick={(e) => handleMenuOpen(e, summary.summary_id)}>
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
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 6, backgroundColor: 'var(--background2)', color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          <Typography variant="h6" fontWeight={600}>
            Summary Preview
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => handleDownload(selectedSummary)}
              sx={{
                backgroundColor: "var(--secondary)",
                color: "white",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "var(--primary)",
                },
                boxShadow: "none",
                borderRadius: 2, 
                fontFamily: "Outfit",
              }}
            >
              Download
            </Button>
            <IconButton
              aria-label="close"
              onClick={handleCloseView}
              sx={{ position: "absolute", right: 8, top: 8, color: "var(--text)" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{backgroundColor: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderTop: 'none'}}>
          {selectedSummary ? (
            <StyledMarkdownContent
              sx={{ marginTop: 2 }}
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