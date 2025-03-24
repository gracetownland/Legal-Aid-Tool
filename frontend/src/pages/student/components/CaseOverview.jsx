
import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack,Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./SideMenu";

import StudentHeader from "../../../components/StudentHeader";
import { fetchAuthSession } from "aws-amplify/auth";

const CaseOverview = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseData = async () => {

      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
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
        console.log(response);
        setCaseData(data);
      } catch (error) {
        console.error("Error fetching case data:", error);
        setCaseData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId]);

  if (loading) {
    return <Typography align="center" mt={5}>Loading...</Typography>;
  }

  const handleSendForReview = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
  
      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/edit_case?case_id=${caseId}`, {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ case_id: caseId }),
      });
  
      if (!response.ok) throw new Error("Failed to send for review");
  
      alert("Case sent for review successfully!");
    } catch (error) {
      console.error("Error sending case for review:", error);
      alert("Failed to send case for review.");
    }
  };

  return (
    <Stack minHeight="100vh">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white" >
        <StudentHeader />
      </Box>

      <Box display="flex" pt="80px">
        <SideMenu />
        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", mx: "auto" }}>
          {!caseData ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
              <Typography variant="h5" color="gray">
                No case data available
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h4" fontWeight={600} mb={3} textAlign="left">
                Case #{caseData.case_hash}
              </Typography>

              {/* <Button onClick={handleSendForReview}>Send For Review</Button> */}

              <Card sx={{ mb: 3, textAlign: "left" }}>
                <CardContent>
                  <Grid container spacing={3}>
                    {[
                      { label: "Case Type", value: caseData.case_type },
                      { label: "Status", value: caseData.status },
                      { label: "Jursidiction", value: caseData.jurisdiction?.join(", ") || "N/A" },
                      { label: "Date Added", value: new Date(caseData.last_updated).toLocaleString() },
                    ].map((item, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Typography variant="h6" fontWeight={500}>
                          {item.label}
                        </Typography>
                        <Typography variant="body2">{item.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              <Typography variant="h6" fontWeight={600} mb={2} textAlign="left">
                Case Description
              </Typography>
              <Box p={3} bgcolor="#f9f9f9" borderRadius={2} >
                <Typography variant="body2" textAlign="left">{caseData.case_description}</Typography>
              </Box>

              {/* {caseData.system_prompt && (
                <>
                  <Divider sx={{ my: 4 }} />
                  <Typography variant="h6" fontWeight={600} mb={2} textAlign="left">
                    Latest Message From Supervisor
                  </Typography>
                  <Box p={3} bgcolor="#e7e7e7" borderRadius={2}>
                    <Typography variant="body2" textAlign="left">{caseData.system_prompt}</Typography>
                  </Box>
                </>
              )} */}
            </>
          )}
        </Container>
      </Box>
    </Stack>
  );
};

export default CaseOverview;
