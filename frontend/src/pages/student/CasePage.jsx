import React, { useState } from "react";
import { Drawer, Box, Typography, List, ListItem, ListItemText, Grid, Divider } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import StudentHeader from "../../components/StudentHeader";

import CaseOverview from "./components/CaseOverview";
import PrelimSummary from "./components/PrelimSummary";
import InterviewAssistant from "./components/InterviewAssistant";

const CasePage = () => {
  const [selectedOption, setSelectedOption] = useState("Case Overview");

  const handleDrawerSelection = (option) => {
    setSelectedOption(option);
  };

  const renderContent = () => {
    switch (selectedOption) {
      case "Case Overview":
        return <CaseOverview />;
      case "Preliminary Summary":
        return <PrelimSummary />;
      case "Interview Assistant":
        return <InterviewAssistant />;
      default:
        return <CaseOverview />;
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
