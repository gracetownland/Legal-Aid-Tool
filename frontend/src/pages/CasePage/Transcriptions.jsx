import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Container, Button, Stack, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Menu, MenuItem, CircularProgress
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { fetchAuthSession } from "aws-amplify/auth";
import { marked } from "marked";
import DOMPurify from "dompurify";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import SideMenu from "./SideMenu";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { v4 as uuidv4 } from "uuid";

const constructTranscriptionWebSocketUrl = (cognitoToken) => {
  const tempUrl = import.meta.env.VITE_GRAPHQL_WS_URL;
  const apiUrl = tempUrl.replace("https://", "wss://");
  const urlObj = new URL(apiUrl);
  urlObj.hostname = urlObj.hostname.replace("appsync-api", "appsync-realtime-api");
  const header = { host: new URL(tempUrl).hostname, Authorization: cognitoToken };
  const encodedHeader = btoa(JSON.stringify(header));
  return `${urlObj.toString()}?header=${encodedHeader}&payload=e30=`;
};

const TranscriptionsPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [transcriptions, setTranscriptions] = useState([]);
  const [userRole, setUserRole] = useState("student");
  const [audioFile, setAudioFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        const token = tokens.idToken;
        const cognitoId = tokens.idToken.payload.sub;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_transcriptions_by_case?user_id=${cognitoId}&case_id=${caseId}`,
          {
            headers: { Authorization: token, "Content-Type": "application/json" },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch transcriptions");

        const data = await response.json();
        setTranscriptions(data);
      } catch (error) {
        console.error("Error fetching transcriptions:", error);
      }
    };

    fetchTranscriptions();
  }, [caseId]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    const fileTypeShort = file.type.split("/")[1];
    const normalizedType = fileTypeShort === "mpeg" ? "mp3" : fileTypeShort;

    setAudioFile({ file: file, name: fileNameWithoutExtension, type: normalizedType });
  };

  const handleAudioUploading = async () => {
    if (isUploading || !audioFile) return;
    setIsUploading(true);

    try {
      const audioFileId = uuidv4();
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken;
      const cognitoId = tokens.idToken.payload.sub;

      const presignedUrlResp = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/generate_presigned_url?audio_file_id=${audioFileId}&file_name=${audioFile.name}&file_type=${audioFile.type}`,
        {
          headers: { Authorization: token },
        }
      );
      const { presignedurl } = await presignedUrlResp.json();

      await fetch(presignedurl, { method: "PUT", headers: { "Content-Type": audioFile.type }, body: audioFile.file });

      await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/initialize_audio_file`,
        {
          method: "POST",
          headers: { Authorization: token, "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_file_id: audioFileId,
            s3_file_path: `${audioFileId}/${audioFile.name}`,
            cognito_id: cognitoId,
            case_id: caseId,
          }),
        }
      );

      const wsUrl = constructTranscriptionWebSocketUrl(token);
      const ws = new WebSocket(wsUrl, "graphql-ws");
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "connection_init" }));
      };

      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.type === "connection_ack") {
          ws.send(JSON.stringify({
            id: audioFileId,
            type: "start",
            payload: {
              data: JSON.stringify({
                query: `subscription OnNotify($audioFileId: String!) { onNotify(audioFileId: $audioFileId) { message audioFileId } }`,
                variables: { audioFileId },
              }),
              extensions: {
                authorization: { Authorization: token, host: new URL(import.meta.env.VITE_GRAPHQL_WS_URL).hostname },
              },
            },
          }));
        } else if (msg.type === "data" && msg.payload?.data?.onNotify?.message === "transcription_complete") {
          ws.close();
          window.location.reload();
        }
      };

      ws.onerror = (err) => console.error("WebSocket error:", err);
      ws.onclose = () => (wsRef.current = null);

      setUploadDialogOpen(false);
    } catch (err) {
      console.error("Upload Error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = (transcription) => {
    setSelectedTranscription(transcription);
    setViewDialogOpen(true);
  };

  const handleDownload = (transcription) => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(transcription.audio_text, 180);
    let y = 10;
    lines.forEach(line => {
      if (y > 280) { doc.addPage(); y = 10; }
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
        <SideMenu />
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">Transcriptions</Typography>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadDialogOpen(true)}>Upload Audio</Button>
            </Stack>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transcriptions.map(t => (
                    <TableRow key={t.audio_file_id}>
                      <TableCell>{new Date(t.timestamp).toLocaleString("en-US")}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button variant="outlined" onClick={() => handleView(t)}>View</Button>
                          <Button variant="outlined" onClick={() => handleDownload(t)}>Download</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Container>
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)}>
        <DialogTitle>Upload Audio</DialogTitle>
        <DialogContent>
          <input type="file" accept="audio/*" onChange={handleFileUpload} />
          <Button variant="contained" fullWidth onClick={handleAudioUploading} disabled={isUploading || !audioFile} sx={{ mt: 2 }}>
            {isUploading ? <CircularProgress size={20} /> : "Upload & Transcribe"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Transcription Preview</Typography>
          <IconButton onClick={() => setViewDialogOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTranscription ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(selectedTranscription.audio_text || "No transcription available")) }} />
          ) : (
            <Typography>No transcription available</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TranscriptionsPage;
