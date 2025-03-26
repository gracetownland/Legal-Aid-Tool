import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  AppBar,
  Container,
  ThemeProvider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import theme from "../../Theme";
import StudentHeader from "../../components/StudentHeader";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const NewCaseForm = () => {
  const [formData, setFormData] = useState({
    broadAreaOfLaw: "",
    jurisdiction: [],
    province: "",
    statute: "",
    statuteDetails: "",
    legalMatterSummary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox"
        ? checked
          ? [...prevData.jurisdiction, value]
          : prevData.jurisdiction.filter((item) => item !== value)
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const caseData = {
      case_title: formData.broadAreaOfLaw,
      case_type: formData.jurisdiction.join(", "),
      case_description: formData.legalMatterSummary,
      system_prompt: formData.legalMatterSummary,
    };

    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens || !tokens.idToken) throw new Error("Authentication failed. No valid token.");

      const userAttributes = await fetchUserAttributes();
      const cognito_id = tokens.idToken.payload.sub;
      const token = tokens.idToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/new_case?` +
          `user_id=${encodeURIComponent(cognito_id)}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(caseData),
        }
      );

      const data = await response.json();
                  
      

      if (!init_llm_response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      
      if (!response.ok) throw new Error(data.error || "Failed to submit case");

      navigate(`/case/${data.case_id}/interview-assistant`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" color="primary" elevation={0}>
        <StudentHeader />
      </AppBar>
      <Container sx={{ display: "flex", justifyContent: "center" }}>
        <Box sx={{ mt: 8, p: 4, backgroundColor: "white", borderRadius: 2, width: "80%" }}>
          <Typography variant="h5" sx={{ textAlign: "left", mb: 2 }}>
            Start A New Case
          </Typography>
          <form noValidate autoComplete="off" onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2, textAlign:"left" }}>
              <InputLabel>Broad Area of Law</InputLabel>
              <Select
                name="broadAreaOfLaw"
                value={formData.broadAreaOfLaw}
                onChange={handleChange}
                required
              >
                {[
                  "Criminal Law",
                  "Civil Law",
                  "Family Law",
                  "Business Law",
                  "Environmental Law",
                  "Health Law",
                  "Immigration Law",
                  "Labour Law",
                  "Personal Injury Law",
                  "Tax Law",
                  "Other",
                ].map((area) => (
                  <MenuItem key={area} value={area}>
                    {area}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2, textAlign:"left" }}>
              <FormLabel>Jurisdiction</FormLabel>
              <FormGroup>
                {["Federal Law", "Provincial"].map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={formData.jurisdiction.includes(option)}
                        onChange={handleChange}
                        name="jurisdiction"
                        value={option}
                      />
                    }
                    label={option}
                  />
                ))}
              </FormGroup>
            </FormControl>

            {formData.jurisdiction.includes("Provincial") && (
              <FormControl fullWidth sx={{ mb: 2, textAlign: "left" }}>
                <InputLabel>Province</InputLabel>
                <Select name="province" value={formData.province} onChange={handleChange}>
                  {["British Columbia", "Ontario", "Quebec", "Alberta", "Nova Scotia"].map(
                    (province) => (
                      <MenuItem key={province} value={province}>
                        {province}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Statute"
              name="statute"
              fullWidth
              variant="outlined"
              value={formData.statute}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Statute Details"
              name="statuteDetails"
              fullWidth
              variant="outlined"
              value={formData.statuteDetails}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Legal Matter Summary"
              name="legalMatterSummary"
              fullWidth
              variant="outlined"
              value={formData.legalMatterSummary}
              onChange={handleChange}
              multiline
              rows={4}
              required
              sx={{ mb: 2 }}
            />
            <Button variant="contained" fullWidth color="primary" type="submit" disabled={isSubmitting} sx={{ color: "white"}}>
              {isSubmitting ? "Submitting..." : "Start Interview"}
            </Button>
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
          </form>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default NewCaseForm;
