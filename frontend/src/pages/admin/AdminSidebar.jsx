import React, { useState } from "react";
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
import ContactPageIcon from "@mui/icons-material/ContactPage";
import GroupsIcon from "@mui/icons-material/Groups";

const AdminSidebar = ({
  setSelectedComponent,
  setSelectedInstructor,
  setSelectedGroup,
}) => {
  // State to control the drawer width
  const [drawerWidth, setDrawerWidth] = useState(220);

  // Function to handle mouse drag for resizing
  const handleMouseMove = (e) => {
    const newWidth = e.clientX; // Get the new width based on the mouse position
    if (newWidth >= 85 && newWidth <= 250) {
      setDrawerWidth(newWidth); // Limit the resizing range
    }
  };

  // Function to handle mouse release (stop resizing)
  const stopResizing = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.userSelect = ""; // Re-enable text selection
  };

  // Start resizing on mousedown
  const startResizing = (e) => {
    e.preventDefault(); // Prevent default behavior to avoid issues
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.userSelect = "none"; // Disable text selection
  };

  return (
    <>
      {/* Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#99DFB2", // Apply the primary color
            boxShadow: "none", // Remove shadow if causing darkening
            transition: "width 0.2s ease", // Smooth transition for resizing
            overflowX: "hidden", // Prevent horizontal scroll bar
          },
        }}
      >
        <Box
          sx={{
            overflow: "hidden", // Prevent horizontal scrolling
            paddingTop: 10,
          }}
        >
          <List>
            {[
              { text: "Instructors", icon: <ContactPageIcon />, route: "AdminInstructors" },
              { text: "Simulation Groups", icon: <GroupsIcon />, route: "AdminSimulationGroups" },
            ].map((item, index) => (
              <React.Fragment key={index}>
                <ListItem
                  button
                  onClick={() => {
                    setSelectedInstructor(null);
                    setSelectedGroup(null);
                    setSelectedComponent(item.route);
                  }}
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

export default AdminSidebar;
