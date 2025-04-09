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
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import SideMenu from "./SideMenu";
import StudentHeader from "../../components/StudentHeader";
import InstructorHeader from "../../components/InstructorHeader";
import { fetchAuthSession } from "aws-amplify/auth";
import { marked } from "marked";

const SummariesPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]);
  const [userRole, setUserRole] = useState("student");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchCaseSummaries = async () => {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const userRole = session.tokens.idToken.payload["cognito:groups"]?.[0] || "student";
      setUserRole(userRole);

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
        setSummaries(data.summaries);
      } catch (error) {
        console.error("Error fetching case summaries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseSummaries();
  }, [caseId]);

  const handleGenerateSummary = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/summary_generation?case_id=${caseId}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to generate summary");

      setSnackbar({
        open: true,
        message: "Summary Generated Successfully!!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      setSnackbar({
        open: true,
        message: "Failed to generate summary.",
        severity: "error",
      });
    }
  };

  const handleDownload = (summary) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let y = margin;
  
    doc.setFontSize(12);
    doc.text(`Summary ID: ${summary.summary_id}`, margin, y);
    y += 10;
  
    doc.text("Content:", margin, y);
    y += 10;
  
    const content = marked.parse(summary.content).replace(/<[^>]+>/g, '');
    const lines = doc.splitTextToSize(content, 180);
  
    for (let i = 0; i < lines.length; i++) {
      if (y + 10 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines[i], margin, y);
      y += 7;
    }
  
    if (y + 10 > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  
    doc.text(`Time Created: ${new Date(summary.time_created).toLocaleString()}`, margin, y + 10);
  
    doc.save(`summary-${summary.summary_id}.pdf`);
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
              <Typography variant="h6" fontWeight={600}>
                Case Summaries
              </Typography>
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {summaries.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time Created</TableCell>
                      <TableCell align="right">Download</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell>{new Date(caseData.last_updated).toLocaleString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: 'numeric', hour12: true
                        })}</TableCell>
                        <TableCell align="right">
                          <Button variant="outlined" onClick={() => handleDownload(summary)}>
                            Download Summary
                          </Button>
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
    </Box>
  );
};

export default SummariesPage;
