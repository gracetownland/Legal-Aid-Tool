import React, { useState } from "react";
import { Drawer, List, ListItem, ListItemText, Box, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import CaseOverview from "./CaseOverview";
import InterviewAssistant from "./InterviewAssistant";
import PrelimSummary from "./PrelimSummary";
import DraggableNotes from "../../../components/DraggableNotes";

const drawerWidth = 240; // Sidebar width

const SideMenu = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const toggleNotes = () => {
    setIsNotesOpen(!isNotesOpen);
    const notesButton = document.getElementById("notesButton");
    const notes = document.getElementById("notes");

    if (notesButton && notes) {
      if (isNotesOpen) {
        notesButton.style.backgroundColor = "#00000000";
        notes.style.visibility = "hidden";
      } else {
        notes.style.visibility = "visible";
        notesButton.style.backgroundColor = "var(--background3)";
      }
    }
  };

  const handleNavigation = (option) => {
    navigate(`/case/${caseId}/${option.toLowerCase().replace(" ", "-")}`);
  };

  return (
    <>
    {/* Draggable Notes (Hidden by Default) */}
    <Box
        id="notes"
        sx={{
          position: "absolute",
          top: "80px",
          zIndex: 9999,
          visibility: "hidden",
        }}
      >
        <DraggableNotes 
        onClose = {toggleNotes}
        />
      </Box>
    <Box sx={{ display: "flex", flexDirection: "row", height: "95vh", }}>
      {/* Sidebar */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            top: "80px", // Push drawer below the student header
            backgroundColor: "var(--background2)",
            color: "var(--text)",
            border: "none",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <List>
          <ListItem button onClick={() => handleNavigation("Overview")}>
            <ListItemText primary="Case Overview" />
          </ListItem>
          <ListItem button onClick={() => handleNavigation("Prelim Summary")}>
            <ListItemText primary="Preliminary Summary" />
          </ListItem>
          <ListItem button onClick={() => handleNavigation("Interview Assistant")}>
            <ListItemText primary="Interview Assistant" />
          </ListItem>
          <Button id="notesButton" onClick={toggleNotes} sx={{ margin: 2 }}>
            Open Notes
          </Button>
        </List>
      </Drawer>

      {/* Main Content (Shifted Right) */}
      <Box sx={{ flexGrow: 1}}>
        <Routes>
          <Route path="/case/overview" element={<CaseOverview />} />
          <Route path="/case/preliminary-summary" element={<PrelimSummary />} />
          <Route path="/case/interview-assistant" element={<InterviewAssistant />} />
        </Routes>
      </Box>
    </Box>
    </>
  );
};

export default SideMenu;
