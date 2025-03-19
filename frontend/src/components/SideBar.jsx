import { Box, Divider, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from "@mui/material";
import { Home, ListAlt, Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const navigate = useNavigate();
  
   const [name, setName] = useState("");
  
  useEffect(() => {
      const fetchName = () => {
        fetchAuthSession()
          .then((session) => {
            return fetchUserAttributes().then((userAttributes) => {
              const token = session.tokens.idToken;
              console.log( session.tokens);
  
              const email = userAttributes.email;
              return fetch(
                `${
                  import.meta.env.VITE_API_ENDPOINT
                }student/get_name?user_email=${encodeURIComponent(email)}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: token,
                    "Content-Type": "application/json",
                  },
                }
              );
            });
          })
          .then((response) => response.json())
          .then((data) => {
            setName(data.name);
          })
          .catch((error) => {
            console.error("Error fetching name:", error);
          });
      };
  
      fetchName();
    }, []);

  const drawer = (
    <Box sx={{ width: drawerWidth, bgcolor: "#F8F9FD", height: "100vh" }}>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold">
          {name}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate("/home")}>
            <ListItemIcon>
              <Home />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate("/cases")}>
            <ListItemIcon>
              <ListAlt />
            </ListItemIcon>
            <ListItemText primary="My Cases" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate("/new-case")}>
            <ListItemIcon>
              <Add />
            </ListItemIcon>
            <ListItemText primary="New Case" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: "block", sm: "none" } }}
      >
        {drawer}
      </Drawer>

      {/* Permanent Sidebar */}
      <Drawer variant="permanent" sx={{ display: { xs: "none", sm: "block" }, width: drawerWidth }}>
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
