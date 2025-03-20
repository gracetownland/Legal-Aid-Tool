import React, { useState, useEffect } from "react";
import { Drawer, List, ListItem, ListItemText, Box, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import CaseOverview from "./CaseOverview";
import InterviewAssistant from "./InterviewAssistant";
import PrelimSummary from "./PrelimSummary";
import DraggableNotes from "../../../components/DraggableNotes";
import SaveIcon from "@mui/icons-material/Save";
import EditNoteIcon from '@mui/icons-material/EditNote';
import IconButton from "@mui/material/IconButton";

const drawerWidth = 240; // Sidebar width

const SideMenu = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isPrelimSummaryGenerated, setIsPrelimSummaryGenerated] = useState(false); // Track if the summary is ready

  const toggleNotes = () => {
    setIsNotesOpen(!isNotesOpen);
    const notesButton = document.getElementById("notesButton");
    const notes = document.getElementById("notes");

    if (notesButton && notes) {
      if (isNotesOpen) {
        notesButton.style.backgroundColor = "var(--secondary)";
        notesButton.style.color = "white";
        
        notes.style.visibility = "hidden";
      } else {
        notes.style.visibility = "visible";
        notesButton.style.backgroundColor = "var(--background3)";
        notesButton.style.color = "#808080";
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
          onClose={toggleNotes}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "row", height: "95vh" }}>
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
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between", // Keeps Save Icon at the bottom
              height: "calc(100% - 80px)", // Adjust height considering the header
              paddingBottom: "16px", // Adds spacing at the bottom
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <List sx={{ flexGrow: 1 }}>
            <ListItem button onClick={() => handleNavigation("Overview")}>
              <ListItemText primary="Case Overview" />
            </ListItem>
            
            {/* Conditionally Render Preliminary Summary */}
            {isPrelimSummaryGenerated && (
              <ListItem button onClick={() => handleNavigation("Prelim Summary")}>
                <ListItemText primary="Preliminary Summary" />
              </ListItem>
            )}

            <ListItem button onClick={() => handleNavigation("Interview Assistant")}>
              <ListItemText primary="Interview Assistant" />
            </ListItem>
          </List>

          {/* Notepad Icon Button in Bottom-Left Corner */}
          <IconButton
            id="notesButton"
            onClick={toggleNotes}
            sx={{
              position: "fixed",
              bottom: 16, // Distance from the bottom
              left: 16,   // Distance from the left
              backgroundColor: "var(--secondary)",
              color: "white",
              padding: "12px",
              borderRadius: "50%",
              boxShadow: "0px 4px 6px rgba(7,7,7,0.1)",
              "&:hover": {
                backgroundColor: "var(--secondary)",
              },
              "&:focus": {
                border: "none",
                outline: "none",
              },
            }}
          >
            <EditNoteIcon fontSize="large" />
          </IconButton>
        </Drawer>

        {/* Main Content (Shifted Right) */}
        <Box sx={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/case/overview" element={<CaseOverview />} />
            <Route path="/case/interview-assistant" element={<InterviewAssistant />} />
            
            {/* Route still exists but only accessible when isPrelimSummaryGenerated is true */}
            {isPrelimSummaryGenerated && (
              <Route path="/case/preliminary-summary" element={<PrelimSummary />} />
            )}
          </Routes>
        </Box>
      </Box>
    </>
  );
};

export default SideMenu;
