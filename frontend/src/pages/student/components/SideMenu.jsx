import React from 'react';
import { Drawer, List, ListItem, ListItemText, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CaseOverview from './CaseOverview';
import InterviewAssistant from './InterviewAssistant';
import PrelimSummary from './PrelimSummary';

const SideMenu = () => {
  const navigate = useNavigate();

  const handleNavigation = (option) => {
    // Navigate to the appropriate page based on the selection
    navigate(`/case/${option.toLowerCase().replace(' ', '-')}`);
  };

  return (
    <Box>
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
        <ListItem button onClick={() => handleNavigation("Overview")}>
          <ListItemText primary="Case Overview" />
        </ListItem>
        <ListItem button onClick={() => handleNavigation("Preliminary Summary")}>
          <ListItemText primary="Preliminary Summary" />
        </ListItem>
        <ListItem button onClick={() => handleNavigation("Interview Assistant")}>
          <ListItemText primary="Interview Assistant" />
        </ListItem>
      </List>
    </Drawer>

      <Routes>
        <Route path="/case/overview" element={<CaseOverview />} />
        <Route path="/case/preliminary-summary" element={<PrelimSummary />} />
        <Route path="/case/interview-assistant" element={<InterviewAssistant />} />
      </Routes>

    </Box>
  );
};

export default SideMenu;
