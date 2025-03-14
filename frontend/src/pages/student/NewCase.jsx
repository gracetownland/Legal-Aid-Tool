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
import StudentHeader from "../../components/StudentHeader";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
  
    // Prepare data for backend
    const caseData = {
      case_title: formData.broadAreaOfLaw,
      case_type: formData.jurisdiction,
      case_description: formData.legalMatterSummary,
      system_prompt: formData.legalMatterSummary, // Setting description as system prompt
    };

    console.log("Form Data:", formData);
  console.log("Sending Case Data:", JSON.stringify(caseData, null, 2));

  
    try {
      // Fetch authentication session
      const { tokens } = await fetchAuthSession();
      if (!tokens || !tokens.idToken) {
        throw new Error("Authentication failed. No valid token.");
      }

      const userAttributes = await fetchUserAttributes();
      const email = userAttributes.email;

      console.log(tokens);
  
      const token = tokens.idToken; // Correct token extraction
      const cognito_id = tokens.idToken.payload.sub

      console.log(cognito_id);
      console.log(caseData);
  
      // Make the API request
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/new_case?` +
  `cognito_id=${encodeURIComponent(cognito_id)}` +
  `&case_title=${encodeURIComponent(caseData.case_title)}` +
  `&case_type=${encodeURIComponent(caseData.case_type)}` +
  `&case_description=${encodeURIComponent(caseData.case_description)}` +
  `&system_prompt=${encodeURIComponent(caseData.case_description)}`,
        {
          method: "POST",
          headers: {
            Authorization: token, // Ensure correct format
            "Content-Type": "application/json",
          },
          body: JSON.stringify(caseData),
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit case");
      }
  
      console.log("Case submitted successfully:", data);
  
      // Navigate to the Interview Assistant page and pass form data
      navigate("/case/interview-assistant",  {state: { caseData: caseData }});
  
    } catch (err) {
      console.error("Error submitting case:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
    backgroundColor: "var(--background2)",
    padding: 2,
  }}
>
  <StudentHeader />
  <Box
    sx={{
      width: "100%",
      maxWidth: 600,
      backgroundColor: "var(--background)",
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
          sx={{
            textAlign: "left",
            "& label": { color: "var(--placeholder-text)" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "var(--input)" },
              "&:hover fieldset": { borderColor: "var(--text)" },
            },
          }}
        />
      </Box>

      {/* Jurisdiction */}
      <Box sx={{ marginBottom: 2 }}>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend" sx={{ textAlign: "left" , color: "var(--text)"}}>
            Jurisdiction
          </FormLabel>
          <RadioGroup
            name="jurisdiction"
            value={formData.jurisdiction}
            onChange={handleChange}
          >
            <FormControlLabel
              value="Federal Law"
              control={<Radio sx={{ color: "var(--text)" }} />}
              label="Federal Law"
              sx={{ color: "var(--text)" }}
            />

            <FormControlLabel
              value="Provincial"
              control={<Radio sx={{ color: "var(--text)" }} />}
              label="Provincial"
              sx={{ color: "var(--text)" }}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Province Dropdown - Conditional Rendering */}
      {formData.jurisdiction === "Provincial" && (
  <Box sx={{ marginBottom: 2 }}>
    <MUIFormControl fullWidth>
      <InputLabel sx={{ color: "var(--placeholder-text)" }}>Province</InputLabel>
      <Select
        name="province"
        value={formData.province}
        onChange={handleChange}
        label="Province"
        required
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "var(--input)" },
            "&:hover fieldset": { borderColor: "var(--text)" },
          },
          "& label": { color: "var(--placeholder-text)" },
        }}
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
          sx={{
            textAlign: "left",
            "& label": { color: "var(--placeholder-text)" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "var(--input)" },
              "&:hover fieldset": { borderColor: "var(--text)" },
            },
          }}
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
          sx={{
            textAlign: "left",
            "& label": { color: "var(--placeholder-text)" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "var(--input)" },
              "&:hover fieldset": { borderColor: "var(--text)" },
            },
          }}
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
          sx={{
            textAlign: "left",
            "& label": { color: "var(--placeholder-text)" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "var(--input)" },
              "&:hover fieldset": { borderColor: "var(--text)" },
            },
          }}
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
