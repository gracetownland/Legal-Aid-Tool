import React from "react";
import { Box, Typography, Card, CardContent, Divider, Grid, Container } from "@mui/material";
import { useNavigate, useLocation} from "react-router-dom";
import SideMenu from "./SideMenu";
import StudentHeader from "../../../components/StudentHeader";

const CaseOverview = () => {
  const location = useLocation();
    const caseData = location.state?.caseData;
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/"); // Navigate to the homepage
  };

  if (!caseData) {
    return (
      <>
        {/* Fixed Student Header */}
        <Box sx={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, bgcolor: "white", boxShadow: 2 }}>
          <StudentHeader />
        </Box>

        <Box sx={{ display: "flex", minHeight: "100vh", pt: "70px" }}> {/* Adjust paddingTop based on header height */}
          <SideMenu />
          <Box sx={{ flexGrow: 1, p: 4, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Typography variant="h5" sx={{ color: "gray" }}>
              No case data available
            </Typography>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      {/* Fixed Student Header */}
      <Box sx={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, bgcolor: "white", boxShadow: 2 }}>
        <StudentHeader />
      </Box>

      {/* Main Content */}
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f4f6f8", pt: "80px" }}> {/* Prevent overlap */}
        <SideMenu />

        <Container sx={{ flexGrow: 1, p: 4, maxWidth: "900px", margin: "0 auto" }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
            {caseData.case_title}
          </Typography>

          {/* Case Information Card */}
          <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3, bgcolor: "white" }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Case Type
                  </Typography>
                  <Typography variant="body2">{caseData.case_type}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Status
                  </Typography>
                  <Typography variant="body2">{caseData.status}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Law Type
                  </Typography>
                  <Typography variant="body2">{caseData.law_type ? caseData.law_type.join(", ") : "N/A"}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body2">{new Date(caseData.last_updated).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Case Description */}
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Case Description
          </Typography>
          <Box sx={{ p: 3, bgcolor: "#f9f9f9", borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="body2">{caseData.case_description}</Typography>
          </Box>

          {/* System Prompt */}
          {caseData.system_prompt && (
            <>
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Latest Message From Supervisor
              </Typography>
              <Box sx={{ p: 3, bgcolor: "#e7e7e7", borderRadius: 2, boxShadow: 1 }}>
                <Typography variant="body2">{caseData.system_prompt}</Typography>
              </Box>
            </>
          )}
        </Container>
      </Box>
    </>
  );
};

export default CaseOverview;
