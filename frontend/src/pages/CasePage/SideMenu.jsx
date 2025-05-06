import React, { useState, useEffect } from "react";
import { Drawer, List, ListItem, ListItemText, Box, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import CaseOverview from "./CaseOverview";
import InterviewAssistant from "./InterviewAssistant";
import CaseFeedback from "./CaseFeedback";
import PrelimSummary from "./PrelimSummary";
import DraggableNotes from "../../components/DraggableNotes";
import SaveIcon from "@mui/icons-material/Save";
import EditNoteIcon from '@mui/icons-material/EditNote';
import IconButton from "@mui/material/IconButton";
import { useLocation } from "react-router-dom";
import { fetchAuthSession } from "aws-amplify/auth";
import { set } from "date-fns";


const drawerWidth = 240; // Sidebar width



const SideMenu = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState("student");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isPrelimSummaryGenerated, setIsPrelimSummaryGenerated] = useState(false); 
  const [isUnreadFeedback, setIsUnreadFeedback] = useState(false);
  const isActive = (route) => location.pathname.includes(route.toLowerCase().replace(" ", "-"));

   useEffect(() => {
      const fetchCaseData = async () => {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognitoId = token.payload.sub;
        const group = token.payload["cognito:groups"]?.[0] || "student";
        setUserRole(group);
  
        const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}student/case_page?case_id=${caseId}&cognito_id=${cognitoId}`, {
          headers: { Authorization: token, "Content-Type": "application/json" },
        });
  
        const data = await res.json();

        console.log(data.messages)
        
        if (data.messages.filter((msg)=> msg.is_read === false).length > 0) {
          setIsUnreadFeedback(true);
        }
      };
  
      fetchCaseData();
    }, [caseId]);

      useEffect(() => {
        const handleViewCase = async () => {
        try {
          const session = await fetchAuthSession();
          const token = session.tokens.idToken;
    
          
    
          const response = await fetch(
            `${import.meta.env.VITE_API_ENDPOINT}student/view_case?case_id=${encodeURIComponent(caseId)}`,
            {
                method: "PUT",
                headers: {
                    Authorization: token,
                    "Content-Type": "application/json",
                },
            })
            
            console.log("Test")
          if (!response.ok) throw new Error("Failed to update last viewed timestamp of case in database:");
          } catch (error) {
            console.error("Error editing case: ", error);
          }
        };
    
        handleViewCase();
      }, []);

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

        onClose = {toggleNotes}
        noteContent = {"Hi"}
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
              justifyContent: "space-between", 
              height: "calc(100% - 80px)", 
              paddingBottom: "16px", 
            },
          }}
          variant="permanent"
          anchor="left"
        >
          <List sx={{ flexGrow: 1 }}>

          <ListItem
  button
  onClick={() => handleNavigation("Overview")}
  selected={isActive("Overview")}
  sx={{
    pl: 2,
    borderLeft: isActive("Overview") ? "4px solid var(--primary)" : "4px solid transparent",
    backgroundColor: isActive("Overview") ? "var(--background3)" : "transparent",
    "&:hover": {
      backgroundColor: "var(--background3)",
      cursor: "pointer",
    },
  }}
>
<ListItemText
    primary="Case Overview"
    primaryTypographyProps={{
      fontWeight: isActive("Overview") ? "bold" : "normal",
      color: isActive("Overview") ? "var(--primary)" : "inherit",
    }}
  />
  </ListItem>
  <ListItem
  button
  onClick={() => handleNavigation("Interview Assistant")}
  selected={isActive("Interview Assistant")}
  sx={{
    pl: 2,
    borderLeft: isActive("Interview Assistant") ? "4px solid var(--primary)" : "4px solid transparent",
    backgroundColor: isActive("Interview Assistant") ? "var(--background3)" : "transparent",
    "&:hover": {
      backgroundColor: "var(--background3)",
      cursor: "pointer",
    },
  }}
>
  <ListItemText
    primary="Interview Assistant"
    primaryTypographyProps={{
      fontWeight: isActive("Interview Assistant") ? "bold" : "normal",
      color: isActive("Interview Assistant") ? "var(--primary)" : "inherit",
    }}
  />
</ListItem>



<ListItem
  button
  onClick={() => handleNavigation("Summaries")}
  selected={isActive("Summaries")}
  sx={{
    pl: 2,
    borderLeft: isActive("Summaries") ? "4px solid var(--primary)" : "4px solid transparent",
    backgroundColor: isActive("Summaries") ? "var(--background3)" : "transparent",
    "&:hover": {
      backgroundColor: "var(--background3)",
      cursor: "pointer",
    },
  }}
>
  <ListItemText
    primary="Case Summaries"
    primaryTypographyProps={{
      fontWeight: isActive("Summaries") ? "bold" : "normal",
      color: isActive("Summaries") ? "var(--primary)" : "inherit",
    }}
  />
</ListItem>

<ListItem
  button
  onClick={() => handleNavigation("Transcriptions")}
  selected={isActive("Transcriptions")}
  sx={{
    pl: 2,
    borderLeft: isActive("Transcriptions") ? "4px solid var(--primary)" : "4px solid transparent",
    backgroundColor: isActive("Transcriptions") ? "var(--background3)" : "transparent",
    "&:hover": {
      backgroundColor: "var(--background3)",
      cursor: "pointer",
    },
  }}
>
  <ListItemText
    primary="Case Transcriptions"
    primaryTypographyProps={{
      fontWeight: isActive("Transcriptions") ? "bold" : "normal",
      color: isActive("Transcriptions") ? "var(--primary)" : "inherit",
    }}
  />
</ListItem>

  <ListItem
  button
  onClick={() => handleNavigation("Feedback")}
  selected={isActive("Feedback")}
  sx={{
    pl: 2,
    borderLeft: isActive("Feedback") ? "4px solid var(--primary)" : "4px solid transparent",
    backgroundColor: isActive("Feedback") ? "var(--background3)" : "transparent",
    "&:hover": {
      backgroundColor: "var(--background3)",
      cursor: "pointer",
    },
  }}
>
  <Box display="flex" alignItems="center">

    {/* Notification Dot */}
    {isUnreadFeedback && userRole === "student" &&  (
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "var(--feedback)",
          mr: 1.5,
        }}
      />
    )}
    <ListItemText
    primary="Case Feedback"
    primaryTypographyProps={{
      fontWeight: isActive("Feedback") ? "bold" : "normal",
      color: isActive("Feedback") ? "var(--primary)" : "inherit",
    }}
  />
  </Box>
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
            <Route path="/case/feedback" element={<CaseFeedback />} />
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
