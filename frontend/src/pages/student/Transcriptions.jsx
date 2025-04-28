import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Container, Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  IconButton, Menu, MenuItem, CircularProgress
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { fetchAuthSession } from "aws-amplify/auth";
import { marked } from "marked";
import DOMPurify from "dompurify";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { v4 as uuidv4 } from "uuid";

const TranscriptionsPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState("student");
  const [transcriptions, setTranscriptions] = useState([]);
  const [selectedTranscription, setSelectedTranscription] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const token = tokens.idToken;
        const cognitoId = tokens.idToken.payload.sub;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_transcriptions?user_id=${cognitoId}`,
          { headers: { Authorization: token, "Content-Type": "application/json" } }
        );

        if (!response.ok) throw new Error("Failed to fetch transcriptions");

        const data = await response.json();
        setTranscriptions(data);
        console.log(data);
      } catch (error) {
        console.error("Error fetching transcriptions:", error);
      }
    };

    fetchTranscriptions();
  }, []);

  const handleView = (transcription) => {
    setSelectedTranscription(transcription);
    setViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedTranscription(null);
  };

  const handleMenuOpen = (event, transcriptionId) => {
    setAnchorEl(event.currentTarget);
    setSelectedTranscriptionId(transcriptionId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTranscriptionId(null);
  };

  const handleDownload = (transcription) => {
    if (!transcription?.audio_text) return;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(transcription.audio_text, 180);

    let y = 10;
    lines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 10;
      }
      doc.text(line, 10, y);
      y += 7;
    });

    doc.save(`transcription-${new Date(transcription.timestamp).toLocaleString("en-US")}.pdf`);
  };

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white">
        {userRole === "instructor" ? <InstructorHeader /> : <StudentHeader />}
      </Box>

      <Box display="flex" pt="80px">
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
          <Stack minHeight="100vh">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4" fontWeight={600}>
                Transcriptions
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload Audio
              </Button>
            </Stack>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                          color: "var(--text)",
                          borderBottom: "1px solid var(--border)",
                          width: "100%",
                        }}>Time Uploaded</TableCell>
                    <TableCell align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transcriptions.map((t) => (
                    <TableRow key={t.audio_file_id}>
                      <TableCell>
                        {new Date(t.timestamp).toLocaleString("en-US", {
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
                          <Button variant="outlined" onClick={() => handleView(t)} sx={{
                              textTransform: "none",
                              backgroundColor: "var(--secondary)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "var(--primary)",
                              },
                              boxShadow: "none", // Optional: removes default MUI shadow
                              borderRadius: 5, // Optional: for consistent button shape
                              fontFamily: "Outfit", // Optional: if you're using this font
                            }}>
                            View
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(t)}
                            sx={{
                              textTransform: "none",
                              backgroundColor: "var(--secondary)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "var(--primary)",
                              },
                              boxShadow: "none", // Optional: removes default MUI shadow
                              borderRadius: 5, // Optional: for consistent button shape
                              fontFamily: "Outfit", // Optional: if you're using this font
                            }}
                          >
                            Download
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {transcriptions.length === 0 && (
              <Typography variant="body2" color="gray" mt={2}>
                No transcriptions available.
              </Typography>
            )}
          </Stack>
        </Container>
      </Box>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseView} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography variant="h6" fontWeight={600}>
            Transcription Preview
          </Typography>
          <IconButton aria-label="close" onClick={handleCloseView}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTranscription?.audio_text ? (
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked.parse(selectedTranscription.audio_text)),
              }}
            />
          ) : (
            <Typography variant="body2">No transcription available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TranscriptionsPage;
