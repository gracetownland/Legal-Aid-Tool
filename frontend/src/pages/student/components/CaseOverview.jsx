import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container, Stack } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "./sidemenu";
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
          `${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}&simulation_group_id=${caseId}=&patient_id=${caseId}`,
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

  return (
    <Stack minHeight="100vh" bgcolor="#f4f6f8">
      <Box position="fixed" top={0} left={0} width="100%" zIndex={1000} bgcolor="white" boxShadow={2}>
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
              <Typography variant="h4" fontWeight={600} mb={3}>
                {caseData.case_title}
              </Typography>

              <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Grid container spacing={3}>
                    {[
                      { label: "Case Type", value: caseData.case_type },
                      { label: "Status", value: caseData.status },
                      { label: "Law Type", value: caseData.law_type?.join(", ") || "N/A" },
                      { label: "Last Updated", value: new Date(caseData.last_updated).toLocaleString() },
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

              <Typography variant="h6" fontWeight={600} mb={2}>
                Case Description
              </Typography>
              <Box p={3} bgcolor="#f9f9f9" borderRadius={2} boxShadow={1}>
                <Typography variant="body2">{caseData.case_description}</Typography>
              </Box>

              {caseData.system_prompt && (
                <>
                  <Divider sx={{ my: 4 }} />
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Latest Message From Supervisor
                  </Typography>
                  <Box p={3} bgcolor="#e7e7e7" borderRadius={2} boxShadow={1}>
                    <Typography variant="body2">{caseData.system_prompt}</Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </Container>
      </Box>
    </Stack>
  );
};

export default CaseOverview;
