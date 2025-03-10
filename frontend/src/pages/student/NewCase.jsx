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
  MenuItem,
  Select,
  InputLabel,
  FormControl as MUIFormControl,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const NewCaseForm = () => {
  // State for form data
  const [formData, setFormData] = useState({
    broadAreaOfLaw: "",
    jurisdiction: "",
    province: "",
    statute: "",
    statuteDetails: "",
    legalMatterSummary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null); // For handling errors during submission
  const navigate = useNavigate(); // React Router navigate hook

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle form submission (without the POST request for now)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    console.log(formData);

    // Navigate to Interview page and pass form data
    navigate("/case/interview-assistant", {state: { caseData: formData }} );

    setIsSubmitting(false);
  };

  // Navigate back to the homepage
  const handleBack = () => {
    navigate("/home");
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
        {/* Back Button */}
        <Button onClick={handleBack} sx={{ mb: 2, textAlign: "left" }}>
          ← Back to Homepage
        </Button>

        <Typography variant="h5" gutterBottom sx={{ textAlign: "left" }}>
          Start A New Case
        </Typography>

        <form noValidate autoComplete="off" onSubmit={handleSubmit}>
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
                <FormControlLabel value="Provincial" control={<Radio />} label="Provincial" />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Province Dropdown - Conditional Rendering */}
          {formData.jurisdiction === "Provincial" && (
            <Box sx={{ marginBottom: 2 }}>
              <MUIFormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  label="Province"
                  required
                >
                  <MenuItem value="British Columbia">British Columbia</MenuItem>
                  <MenuItem value="Ontario">Ontario</MenuItem>
                  <MenuItem value="Quebec">Quebec</MenuItem>
                  <MenuItem value="Alberta">Alberta</MenuItem>
                  <MenuItem value="Nova Scotia">Nova Scotia</MenuItem>
                  {/* Add more provinces as necessary */}
                </Select>
              </MUIFormControl>
            </Box>
          )}

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

          {/* Submit Button */}
          <Button
            variant="contained"
            fullWidth
            color="primary"
            type="submit" // Changed to 'submit' to trigger form submission
            sx={{ textAlign: "left", color: "white" }}
            disabled={isSubmitting} // Disable when submitting
          >
            {isSubmitting ? "Submitting..." : "Start Interview"}
          </Button>

          {/* Display Error Message */}
          {error && (
            <Box sx={{ marginTop: 2, color: "red", textAlign: "left" }}>
              <Typography variant="body1">{error}</Typography>
            </Box>
          )}
        </form>
      </Box>
    </Box>
  );
};

export default NewCaseForm;
