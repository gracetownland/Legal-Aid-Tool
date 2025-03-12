import React, { useState } from "react";
import { Drawer, Box, Typography, List, ListItem, ListItemText, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigate to navigate back
import CaseOverview from "./components/CaseOverview";
import PrelimSummary from "./components/PrelimSummary";
import InterviewAssistant from "./components/InterviewAssistant";
import SideMenu from "./components/sidemenu";

const CasePage = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate hook
  const { caseData } = location.state || {}; // Get the case data passed via navigate

  const [selectedOption, setSelectedOption] = useState("Case Overview");

  const handleDrawerSelection = (option) => {
    setSelectedOption(option);
  };

  const renderContent = () => {
    switch (selectedOption) {
      case "Case Overview":
        return <CaseOverview caseData={caseData} />;
      case "Preliminary Summary":
        return <PrelimSummary caseData={caseData} />;
      case "Interview Assistant":
        navigate("/case/interview-assistant", {state: {caseData: caseData}}); 
      default:
        return <CaseOverview caseData={caseData} />;
    }
  };

  const handleBackToHome = () => {
    navigate("/home"); // Navigate to the home page
  };

  return (
    <Box display="flex">
      <SideMenu />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
        }}
      >
        {/* Back to Home Button */}
        <Button 
          onClick={handleBackToHome} 
          sx={{ marginBottom: 2, }}
        >
          Back to Home Page
        </Button>

        {/* Render Selected Option Content */}
        {renderContent()}
      </Box>
    </Box>
  );
};

export default CasePage;
