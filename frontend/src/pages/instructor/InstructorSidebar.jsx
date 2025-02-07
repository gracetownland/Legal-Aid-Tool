import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home"; // old icon
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import EditIcon from "@mui/icons-material/Edit";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GroupIcon from "@mui/icons-material/Group";

import GroupsIcon from "@mui/icons-material/Groups";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const InstructorSidebar = ({ setSelectedComponent }) => {
  const navigate = useNavigate();
  const [drawerWidth, setDrawerWidth] = useState(220);

  const handleMouseMove = (e) => {
    const newWidth = e.clientX;
    if (newWidth >= 85 && newWidth <= 250) {
      setDrawerWidth(newWidth);
    }
  };

  const stopResizing = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.userSelect = "";
  };

  const startResizing = (e) => {
    e.preventDefault();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.userSelect = "none";
  };

  const handleNavigation = (component) => {
    if (component === "InstructorAllGroups") {
      navigate("/home");
    } else {
      setSelectedComponent(component);
    }
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#99DFB2", 
            boxShadow: "none",
            transition: "width 0.2s ease",
            overflowX: "hidden",
          },
        }}
      >
        <Box
          sx={{
            overflow: "hidden",
            paddingTop: 10,
          }}
        >
          <List>
            {[
              { text: "All Groups", icon: <GroupsIcon />, route: "InstructorAllGroups" },
              { text: "Analytics", icon: <ShowChartIcon />, route: "InstructorAnalytics" },
              { text: "Edit Patients", icon: <EditIcon />, route: "InstructorEditPatients" },
              { text: "Prompt Settings", icon: <PsychologyIcon />, route: "PromptSettings" },
              { text: "View Students", icon: <GroupIcon />, route: "ViewStudents" },
            ].map((item, index) => (
              <React.Fragment key={index}>
                <ListItem
                  button
                  onClick={() => handleNavigation(item.route)}
                  sx={{
                    display: "flex",
                    justifyContent: drawerWidth <= 160 ? "center" : "flex-start",
                    alignItems: "center",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minWidth: 0,
                      marginRight: drawerWidth > 160 ? 2 : 0,
                      width: drawerWidth <= 160 ? "100%" : "auto",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {drawerWidth > 160 && <ListItemText primary={item.text} />}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Resizing Handle */}
      <div
        onMouseDown={startResizing}
        style={{
          width: "5px",
          cursor: "col-resize",
          height: "100vh",
          backgroundColor: "transparent",
          position: "absolute",
          top: 0,
          left: drawerWidth,
        }}
      />
    </>
  );
};

export default InstructorSidebar;
