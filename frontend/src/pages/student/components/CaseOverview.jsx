import React from "react";
import { Box, Typography, Card, CardContent, Divider, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SideMenu from "./sidemenu";

// CaseOverview Page
const CaseOverview = ({ caseData }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/"); // Navigate to the homepage
  };

  if (!caseData) {
    return (
      <Box sx={{ display: "flex" }}>
        <SideMenu /> {/* Sidebar Menu */}
        <Box sx={{ flexGrow: 1, padding: 4 }}>
          <Typography variant="h5">No case data available</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <SideMenu /> {/* Sidebar Menu */}

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, padding: 4 }}>
        {/* Case Title and Basic Information */}
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 3, textAlign: "left" }}>
          {caseData.case_title}
        </Typography>

        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <CardContent>
            <Grid container spacing={3}>
              {/* Case Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 500, textAlign: "left" }}>
                  Case Type
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "left" }}>
                  {caseData.case_type}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 500, textAlign: "left" }}>
                  Status
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "left" }}>
                  {caseData.status}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 500, textAlign: "left" }}>
                  Law Type
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "left" }}>
                  {caseData.law_type ? caseData.law_type.join(", ") : "N/A"}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 500, textAlign: "left" }}>
                  Last Updated
                </Typography>
                <Typography variant="body2" sx={{ textAlign: "left" }}>
                  {new Date(caseData.last_updated).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Case Description */}
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: "left" }}>
          Case Description
        </Typography>
        <Box sx={{ p: 3, bgcolor: "#f9f9f9", borderRadius: 2 }}>
          <Typography variant="body2" sx={{ textAlign: "left" }}>
            {caseData.case_description}
          </Typography>
        </Box>

        {/* System Prompt */}
        {caseData.system_prompt && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: "left" }}>
              Latest Message From Supervisor
            </Typography>
            <Box sx={{ p: 3, bgcolor: "#e7e7e7", borderRadius: 2 }}>
              <Typography variant="body2" sx={{ textAlign: "left" }}>
                {caseData.system_prompt}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default CaseOverview;
