import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Grid,
  Divider,
} from "@mui/material";

const NewCaseForm = () => {
  // State for form data
  const [formData, setFormData] = useState({
    broadAreaOfLaw: "",
    jurisdiction: "",
    statute: "",
    statuteDetails: "",
    legalMatterSummary: "",
  });

  const [saveForLater, setSaveForLater] = useState(false);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  // Start the interview process (you can call your interview API here)
  const handleStartInterview = () => {
    console.log("Interview started with form data:", formData);
    // Add logic to transition to the next step in the interview
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f4f4f9",
        padding: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ textAlign: "left" }}>
          Start A New Case
        </Typography>

        <form noValidate autoComplete="off">
          {/* Broad Area of Law */}
          <Box sx={{ marginBottom: 2 }}>
            <TextField
              label="What broad area of law is engaged by your file?"
              name="broadAreaOfLaw"
              fullWidth
              variant="outlined"
              value={formData.broadAreaOfLaw}
              onChange={handleChange}
              required
              sx={{ textAlign: "left" }}
            />
          </Box>

          {/* Jurisdiction */}
          <Box sx={{ marginBottom: 2 }}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ textAlign: "left" }}>
                Jurisdiction
              </FormLabel>
              <RadioGroup
                name="jurisdiction"
                value={formData.jurisdiction}
                onChange={handleChange}
              >
                <FormControlLabel value="Federal Law" control={<Radio />} label="Federal Law" />
                <FormControlLabel value="British Columbia" control={<Radio />} label="British Columbia" />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Statute and Statutory Section */}
          <Box sx={{ marginBottom: 2 }}>
            <TextField
              label="Does the legal problem involve a particular statute and/or statutory section?"
              name="statute"
              fullWidth
              variant="outlined"
              value={formData.statute}
              onChange={handleChange}
              required
              sx={{ textAlign: "left" }}
            />
          </Box>

          {/* Statute Details (Specific statutory provisions) */}
          <Box sx={{ marginBottom: 2 }}>
            <TextField
              label="If possible, provide a specific statutory provision (e.g., ‘section 267(b) of the Criminal Code’)"
              name="statuteDetails"
              fullWidth
              variant="outlined"
              value={formData.statuteDetails}
              onChange={handleChange}
              sx={{ textAlign: "left" }}
            />
          </Box>

          {/* Legal Matter Summary */}
          <Box sx={{ marginBottom: 2 }}>
            <TextField
              label="Can you briefly summarize the broad legal matter in issue?"
              name="legalMatterSummary"
              fullWidth
              variant="outlined"
              value={formData.legalMatterSummary}
              onChange={handleChange}
              multiline
              rows={4}
              required
              sx={{ textAlign: "left" }}
            />
          </Box>

          {/* Buttons */}
          
              <Button
                variant="contained"
                fullWidth
                color="primary"
                onClick={handleStartInterview}
                sx={{ textAlign: "left" }}
              >
                Start Interview
              </Button>

          {/* Optionally show the 'saved' state */}
          {saveForLater && (
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="body1" color="primary" sx={{ textAlign: "left" }}>
                Your progress has been saved for later.
              </Typography>
            </Box>
          )}
        </form>
      </Box>
    </Box>
  );
};

export default NewCaseForm;
