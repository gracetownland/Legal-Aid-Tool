import React, { useState } from "react";
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

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "var(--background2)",
            color: "var(--text)",
            border: "none",
            top: "80px",
            height: "calc(100% - 80px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            paddingBottom: "16px",
            overflowX: "hidden",
            transition: "width 0.2s ease",
          },
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
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
                    px: drawerWidth > 160 ? 2 : 0,
                    justifyContent: drawerWidth <= 160 ? "center" : "flex-start",
                    "&:hover": {
                      backgroundColor: "var(--background3)",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: "inherit",
                      minWidth: 0,
                      mr: drawerWidth > 160 ? 2 : 0,
                      justifyContent: "center",
                      width: drawerWidth <= 160 ? "100%" : "auto",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {drawerWidth > 160 && <ListItemText primary={item.text} />}
                </ListItem>
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
