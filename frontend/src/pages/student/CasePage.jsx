import React, { useState, useEffect } from "react";
import { Drawer, Box, Typography, List, ListItem, ListItemText, Grid, Divider } from "@mui/material";
import { useLocation } from "react-router-dom"; // Import useLocation to get the passed case data
import StudentHeader from "../../components/StudentHeader";

import CaseOverview from "./components/CaseOverview";
import PrelimSummary from "./components/PrelimSummary";
import InterviewAssistant from "./components/InterviewAssistant";

const CasePage = () => {
  const location = useLocation();
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
        return <InterviewAssistant caseData={caseData} />;
      default:
        return <CaseOverview caseData={caseData} />;
    }
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
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <List>
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
        {renderContent()}
      </Box>
    </Box>
  );
};

export default CasePage;
