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
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import { marked } from "marked";
import CloseIcon from "@mui/icons-material/Close";
import DOMPurify from "dompurify";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { v4 as uuidv4 } from "uuid";
import { useRef } from "react";

const constructTranscriptionWebSocketUrl = (cognitoToken, caseId) => {
  const tempUrl = import.meta.env.VITE_GRAPHQL_WS_URL;
  const apiUrl = tempUrl.replace("https://", "wss://");
  const urlObj = new URL(apiUrl);
  urlObj.hostname = urlObj.hostname.replace(
    "appsync-api",
    "appsync-realtime-api"
  );
  const header = {
    host: new URL(tempUrl).hostname,
    Authorization: cognitoToken,
  };
  const encodedHeader = btoa(JSON.stringify(header));
  // payload is empty JSON
  return `${urlObj.toString()}?header=${encodedHeader}&payload=e30=`;
};


const Transcriptions = () => {
  const navigate = useNavigate();

  const [transcriptions, setTranscriptions] = useState([]);
  const [userRole, setUserRole] = useState("student");
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  const [audioFile, setAudioFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const openMenu = Boolean(anchorEl);

  const wsRef = useRef(null);

  const setupWebSocket = (cognitoToken, caseId) => {
    return new Promise((resolve, reject) => {
      const url = constructTranscriptionWebSocketUrl(cognitoToken, caseId);
      const ws = new WebSocket(url, "graphql-ws");
      wsRef.current = ws;
      
      console.log("WebSocket URL:", url);
      
      ws.onopen = () => {
        console.log("WebSocket connection opened");
        // Only send the connection_init message on open
        ws.send(JSON.stringify({ type: "connection_init" }));
      };
    
      ws.onmessage = ({ data }) => {
        let msg;
        try {
          msg = JSON.parse(data);
          console.log("WebSocket message received:", msg); // Add logging
        } catch (error) {
          console.error("Failed to parse message:", error);
          return;
        }
        
        // Wait for connection acknowledgment before sending subscription
        if (msg.type === "connection_ack") {
          console.log("Connection acknowledged, sending subscription");
          // Now send the subscription after acknowledgment
          ws.send(
            JSON.stringify({
              id: caseId,
              type: "start",
              payload: {
                data: JSON.stringify({
                  query: `
                    subscription OnNotify($caseId: String!) {
                      onNotify(caseId: $caseId) {
                        message
                        caseId
                      }
                    }
                  `,
                  variables: { caseId },
                }),
                extensions: {
                  authorization: {
                    Authorization: cognitoToken,
                    host: new URL(import.meta.env.VITE_GRAPHQL_WS_URL).hostname,
                  },
                },
              },
            })
          );
        } 
        else if (msg.type === "data" && msg.payload?.data?.onNotify) {
          const text = msg.payload.data.onNotify.message;
          console.log("Received transcription update:", text);
          if (text === "transcription_complete") {
            // cleanup
            ws.close();
            resolve();
          }
        }
        else if (msg.type === "error") {
          console.error("Subscription error:", msg);
          reject(new Error(`Subscription error: ${JSON.stringify(msg)}`));
        }
      };
    
      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        reject(err);
      };
    
      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        wsRef.current = null;
      };
      
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    const fileTypeShort = file.type.split("/")[1];
    const normalizedType = fileTypeShort === "mpeg" ? "mp3" : fileTypeShort;
  
    setAudioFile({
      file: file,
      name: fileNameWithoutExtension,
      type: normalizedType,
    });
  
    console.log({
      file: file,
      name: fileNameWithoutExtension,
      type: normalizedType,
    });
  };

  const openUploadDialog = () => {
    setUploadDialogOpen(true);
    setAudioFile(null);
    setError(null);
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setAudioFile(null);
    setError(null);
  };

  const generatePresignedUrl = async (case_id) => {
    try {
      const fileName = audioFile.name;
      // Make sure we're using the correct file type from the original file
      const fileType = audioFile.file.type;
      const fileExtension = audioFile.type;
      
      console.log("Requesting presigned URL with:", {
        case_id,
        fileName,
        fileType,
        fileExtension
      });
      
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/generate_presigned_url?` +
        `case_id=${encodeURIComponent(case_id)}&` +
        `file_name=${encodeURIComponent(fileName)}&` +
        `file_type=${encodeURIComponent(fileExtension)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate presigned URL: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.presignedurl;
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw error;
    }
  };
  
  const audioToText = async (case_id) => {
    try {
      const fileName = audioFile.name;
      // Make sure we're using the correct file type from the original file
      const fileType = audioFile.file.type;
      const fileExtension = audioFile.type;
      
      console.log("Transcribing with:", {
        case_id,
        fileName,
        fileType,
        fileExtension
      });
      
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken;
      const tokenString = tokens.idToken.toString();
      
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/audio_to_text?` +
        `case_id=${encodeURIComponent(case_id)}&` +
        `file_name=${encodeURIComponent(fileName)}&` +
        `file_type=${encodeURIComponent(fileExtension)}&` + 
        `cognito_token=${encodeURIComponent(tokenString)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate presigned URL: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(data);
      return data.text;
    } catch (error) {
      console.error("Error Transcribing:", error);
      throw error;
    }
  };
  
  // Update the uploadFile function in NewCaseForm.jsx
  const uploadFile = async (file, presignedUrl) => {
    try {
      // Use the actual file from the audioFile object
      const fileToUpload = audioFile.file;
      
      console.log("Uploading file with content type:", fileToUpload.type);
      
      const response = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileToUpload.type,
        },
        body: fileToUpload,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      console.log(response);
      console.log("Upload successful:", response);
      return response;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleAudioUploading = async () => {
    if (isUploading || !audioFile) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Step 1: Generate a case ID
      const case_id = uuidv4();
      console.log("Generated case ID:", case_id);
      
      // Step 2: Generate Presigned URL
      const presigned_url = await generatePresignedUrl(case_id);
      console.log("Received presigned URL:", presigned_url);
      
      // Step 3: Upload the file
      await uploadFile(audioFile.file, presigned_url);
      console.log('File uploaded successfully for case:', case_id);

      // Step 4: Set up WebSocket for updates

        // 2️⃣ open WebSocket subscription & wait for completion
      const { tokens } = await fetchAuthSession();
      const cognitoToken = tokens.idToken.toString(); // or tokens.idToken.getJwtToken()
      await setupWebSocket(cognitoToken, case_id);
      console.log("WebSocket subscription set up for case:", case_id);
      console.log("calling audio to text");
      await audioToText(case_id);

      // 3️⃣ Show toast / Snackbar
      setSnackbarMessage("Transcription complete!");

      // Step 4: Navigate to the next step or display success regardless of previous errors
      closeUploadDialog();
    } catch (error) {
      console.error("Upload error:", error);
      setError(error.message || "Failed to upload audio file");
    } finally {
      setIsUploading(false);
    }
  };

  const getTranscriptions = async () => {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken;
    const role = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
    setUserRole(role);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/`,
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
      setTranscriptions(
        data.transcriptions.sort(
          (a, b) => new Date(b.time_created) - new Date(a.time_created)
        )
      );
      console.log(data)
    } catch (error) {
      console.error("Error fetching case transcriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTranscriptions();
  }, []);
    
  const handleView = (summary) => {
    setSelectedSummary(summary);
    setViewDialogOpen(true);
  };

  const handleCloseView = () => {
    setViewDialogOpen(false);
    setSelectedSummary(null);
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
      await getTranscriptions();
      setTranscriptions((prev) => prev.filter((s) => s.id !== selectedSummaryId));
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
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
          <Stack minHeight="100vh">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4" fontWeight={600} mb={0} textAlign="left">
                Transcriptions
              </Typography>

              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<CloudUploadIcon />}
                onClick={openUploadDialog}
              >
                Upload Audio
              </Button>
            </Stack>

            {transcriptions.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transcriptions.map((summary) => (
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

      {/* Audio Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={closeUploadDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Audio File
          <IconButton
            aria-label="close"
            onClick={closeUploadDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Select an audio file to upload for transcription
            </Typography>
            
            {audioFile ? (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1">Selected file:</Typography>
                <Typography>{audioFile.file.name} ({(audioFile.file.size / 1024 / 1024).toFixed(2)} MB)</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  mt: 2,
                  p: 3,
                  border: '2px dashed #e0e0e0',
                  borderRadius: 1,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
                onClick={() => document.getElementById('audio-file-input').click()}
              >
                <input
                  id="audio-file-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: '#9e9e9e', mb: 1 }} />
                <Typography>Click to select an audio file or drag & drop here</Typography>
                <Typography variant="caption" color="textSecondary">
                  Supported formats: MP3, WAV, M4A, etc.
                </Typography>
              </Box>
            )}
            
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeUploadDialog} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAudioUploading}
            disabled={!audioFile || isUploading}
            startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isUploading ? 'Processing...' : 'Upload & Transcribe'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default Transcriptions;