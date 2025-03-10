import React from 'react';
import { Drawer, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SideMenu = () => {
  const navigate = useNavigate();

  const handleNavigation = (option) => {
    // Navigate to the appropriate page based on the selection
    navigate(`/case/${option.toLowerCase().replace(' ', '-')}`);
  };

  return (
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
  );
};

export default SideMenu;
