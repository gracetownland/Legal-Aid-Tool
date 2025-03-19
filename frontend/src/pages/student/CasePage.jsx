import React, { useState } from "react";
import { Drawer, Box, Typography, List, ListItem, ListItemText, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigate to navigate back
import CaseOverview from "./components/CaseOverview";
import PrelimSummary from "./components/PrelimSummary";
import InterviewAssistant from "./components/InterviewAssistant";
import DraggableNotes from "../../components/DraggableNotes";

const CasePage = ({caseData}) => {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate hook
 // const { caseData } = location.state || {}; // Get the case data passed via navigate

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

      

      {/* Left Sidebar Drawer */}
      <Drawer
      sx={{
        width: 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 240,
          boxSizing: "border-box",
          backgroundColor: "var(--background2)", // Uses CSS variable
          color: "var(--text)", // Uses CSS variable
          border: "none",
          display: "flex", // Ensure flex container for alignment
          flexDirection: "column",
        },
      }}
      variant="permanent"
    >
      <List sx={{ flexGrow: 1 }}>
        <ListItem button onClick={() => handleDrawerSelection("Case Overview")}>
          <ListItemText primary="Case Overview" />
        </ListItem>
        <ListItem button onClick={() => handleDrawerSelection("Preliminary Summary")}>
          <ListItemText primary="Preliminary Summary" />
        </ListItem>
        <ListItem button onClick={() => handleDrawerSelection("Interview Assistant")}>
          <ListItemText primary="Interview Assistant" />
        </ListItem>
      </List>

      

    </Drawer>


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
