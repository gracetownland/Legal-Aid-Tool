import React, { useState } from "react";
import { Drawer, Box, Typography, List, ListItem, ListItemText, Grid, Divider } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import StudentHeader from "../../components/StudentHeader";

const CaseOveriew = () => {
  const [selectedOption, setSelectedOption] = useState("Case Overview");

  const handleDrawerSelection = (option) => {
    setSelectedOption(option);
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
                <ListItem button onClick={() => handleDrawerSelection("Prelim Summary")}>
                    <ListItemText primary="Prelim Summary" />
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
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'left'}}>
                {selectedOption}
                </Typography>

                {/* Case Details Section */}
                <Grid container spacing={2} sx={{ marginBottom: 3, textAlign: 'left' }}>
                <Grid item xs={3}>
                    <Typography variant="h7">Case Type:</Typography>
                    <Typography variant="body1">Criminal</Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="h7">Date Updated:</Typography>
                    <Typography variant="body1">Feb 12, 2025</Typography>
                </Grid>
                <Grid item xs={3}>
                    <Typography variant="h7">Case Title:</Typography>
                    <Typography variant="body1">Theft Case</Typography>
                </Grid>
                </Grid>

                <Divider />

                {/* Case Description */}
                <Box sx={{ marginBottom: 3 }}>
                <Typography variant="h6">Case Description:</Typography>
                <Typography variant="body1">
                    This is a detailed description of the case. The case involves a theft that occurred in the downtown
                    area, and the suspect has been identified. The investigation is ongoing.
                </Typography>
                </Box>

                <Divider />

                {/* Latest Supervisor Message */}
                <Box sx={{ marginTop: 3 }}>
                <Typography variant="h6">Latest Message from Supervisor:</Typography>
                <Typography variant="body1">
                    "Please ensure that all witnesses are interviewed and their statements are recorded by the end of the week."
                </Typography>
                </Box>
            </Box>
            </Box>
  );
};

export default CaseOveriew;
