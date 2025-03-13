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
  Select,
  MenuItem,
  InputLabel,
  AppBar,
  Toolbar,
  Container,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import StudentHeader from "../../components/StudentHeader";

const NewCaseForm = () => {
  const [formData, setFormData] = useState({
    broadAreaOfLaw: "",
    jurisdiction: "",
    province: "",
    statute: "",
    statuteDetails: "",
    legalMatterSummary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

    const caseData = {
      case_title: formData.broadAreaOfLaw,
      case_type: formData.jurisdiction,
      case_description: formData.legalMatterSummary,
      system_prompt: formData.legalMatterSummary,
    };

    try {
      const { tokens } = await fetchAuthSession();
      if (!tokens || !tokens.idToken) {
        throw new Error("Authentication failed. No valid token.");
      }

      const userAttributes = await fetchUserAttributes();
      const cognito_id = tokens.idToken.payload.sub;
      const token = tokens.idToken;

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
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(caseData),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit case");
      }

      navigate(`/case/${caseId}/interview-assistant`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppBar position="static" color="primary">
        <StudentHeader />
      </AppBar>
      <Container>
        <Box sx={{ mt: 4, p: 4, backgroundColor: "white", boxShadow: 3, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom>
            Start A New Case
          </Typography>
          <form noValidate autoComplete="off" onSubmit={handleSubmit}>
            <TextField label="Broad Area of Law" name="broadAreaOfLaw" fullWidth variant="outlined" value={formData.broadAreaOfLaw} onChange={handleChange} required sx={{ mb: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <FormLabel>Jurisdiction</FormLabel>
              <RadioGroup name="jurisdiction" value={formData.jurisdiction} onChange={handleChange}>
                <FormControlLabel value="Federal Law" control={<Radio />} label="Federal Law" />
                <FormControlLabel value="Provincial" control={<Radio />} label="Provincial" />
              </RadioGroup>
            </FormControl>
            {formData.jurisdiction === "Provincial" && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Province</InputLabel>
                <Select name="province" value={formData.province} onChange={handleChange}>
                  <MenuItem value="British Columbia">British Columbia</MenuItem>
                  <MenuItem value="Ontario">Ontario</MenuItem>
                  <MenuItem value="Quebec">Quebec</MenuItem>
                  <MenuItem value="Alberta">Alberta</MenuItem>
                  <MenuItem value="Nova Scotia">Nova Scotia</MenuItem>
                </Select>
              </FormControl>
            )}
            <TextField label="Statute" name="statute" fullWidth variant="outlined" value={formData.statute} onChange={handleChange} required sx={{ mb: 2 }} />
            <TextField label="Statute Details" name="statuteDetails" fullWidth variant="outlined" value={formData.statuteDetails} onChange={handleChange} sx={{ mb: 2 }} />
            <TextField label="Legal Matter Summary" name="legalMatterSummary" fullWidth variant="outlined" value={formData.legalMatterSummary} onChange={handleChange} multiline rows={4} required sx={{ mb: 2 }} />
            <Button variant="contained" fullWidth color="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Start Interview"}
            </Button>
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
          </form>
        </Box>
      </Container>
    </>
  );
};

export default NewCaseForm;
