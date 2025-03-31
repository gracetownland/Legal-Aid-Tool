import React, { useEffect, useState } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import InstructorHeader from "../../components/InstructorHeader";

const InstructorHomepage = () => {
  const [submittedCases, setSubmittedCases] = useState([]);

  useEffect(() => {
    const fetchSubmittedCases = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognito_id = session.tokens.idToken.payload.sub;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}instructor/submitted-cases?cognito_id=${encodeURIComponent(cognito_id)}`,
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
          setSubmittedCases(data);
        } else {
          console.error("Failed to fetch submitted cases:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching submitted cases:", error);
      }
    };

    fetchSubmittedCases();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Fixed Header */}
      <div style={{ position: "fixed", top: 0, width: "100%", zIndex: 1000, backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <InstructorHeader />
      </div>

      {/* Main Content */}
      <div style={{ marginTop: "80px", padding: "20px" }}> {/* Adjust marginTop as needed */}
        <Typography color="black" fontWeight="bold" textAlign="left" variant="h6">
          Cases Submitted for Review
        </Typography>
        <Paper sx={{ width: "80%", margin: "0 auto", padding: 2 }}>
          {submittedCases.length > 0 ? (
            <TableContainer>
              <Table aria-label="submitted cases table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: "40%", padding: "16px" }}>Case Name</TableCell>
                    <TableCell sx={{ width: "40%", padding: "16px" }}>Submitted By</TableCell>
                    <TableCell sx={{ width: "20%", padding: "16px" }}>Date Submitted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submittedCases.map((caseItem, index) => (
                    <TableRow
                      key={index}
                      style={{ cursor: "pointer", transition: "background-color 0.3s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                    >
                      <TableCell sx={{ padding: "16px" }}>{caseItem.case_name}</TableCell>
                      <TableCell sx={{ padding: "16px" }}>{caseItem.submitted_by}</TableCell>
                      <TableCell sx={{ padding: "16px" }}>{new Date(caseItem.date_submitted).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" sx={{ textAlign: "center", marginTop: 2 }}>
              No cases submitted for review.
            </Typography>
          )}
        </Paper>
      </div>
    </div>
  );
};

export default InstructorHomepage;
