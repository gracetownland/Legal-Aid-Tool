import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  RadioGroup,
  Radio,
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
      [name]:
        type === "checkbox"
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
      case_title: "New Case", // Temporary placeholder title while one is generated
      case_type: formData.broadAreaOfLaw,
      jurisdiction: formData.jurisdiction,
      case_description: formData.legalMatterSummary,
      province: formData.province,
      statute: formData.statuteDetails,
    };

    try {
      console.log("Submitting the case with data:", caseData);

      const { tokens } = await fetchAuthSession();
      if (!tokens || !tokens.idToken)
        throw new Error("Authentication failed. No valid token.");
      console.log("Authentication successful, tokens obtained.");

      const userAttributes = await fetchUserAttributes();
      const cognito_id = tokens.idToken.payload.sub;
      const token = tokens.idToken;

      console.log("User attributes fetched, cognito_id:", cognito_id);

      // Step 1: Create the case in the database
      console.log("Creating the case in the database...");
      console.log(JSON.stringify(caseData));
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/case?` +
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
      console.log("Response from creating case:", data);

      // Check for guardrails or other errors
      if (!response.ok) {
        setError(data.error || "Failed to submit case");
        setIsSubmitting(false);
        return;
      }

      // Step 2: Generate a title for the newly created case
      console.log("Generating title for the case...");
      const get_title = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/title_generation?case_id=${data.case_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        }
      );

      const titleData = await get_title.json();
      console.log("Title generated:", titleData);

      if (!get_title.ok) {
        setError(titleData.error || "Failed to generate title");
        setIsSubmitting(false);
        return;
      }

      // Step 3: Optionally update the case with the new title
      const updatedCaseData = {
        case_title: titleData.generated_title,
        case_type: formData.broadAreaOfLaw,
        jurisdiction: formData.jurisdiction,
        case_description: formData.legalMatterSummary,
        province: formData.province,
        statute: formData.statuteDetails,
      };

      console.log("Updating the case with the generated title...");
      
      const updateResponse = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/edit_case?case_id=${data.case_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedCaseData),
        }
      );

      // If the update fails, you can optionally display an error
      if (!updateResponse.ok) {
        const updateData = await updateResponse.json();
        setError(updateData.error || "Failed to update case title");
        setIsSubmitting(false);
        return;
      }

      // Step 4: Continue with the rest of the logic (e.g., generating the legal summary)
      console.log("Generating legal matter summary...");
      
      const init_llm_response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/text_generation?case_id=${data.case_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            message_content: "Please provide a brief analysis of the legal matter first to show me all of the legal case facts and relevant legal resources I can refer to, using legal vocabulary. In this analysis, show me a breif list of essential elements of proving the case, and also show me relevant legal texts that encompass the case; please cite 4-5 legal cases and or docments I can refer to, preferably reasonably recent, but if older cases are particularly relevant, they acceptable. Please also include any additional insights that could help me approach this case, such as relevant issues (if any) or anything else important. In addition to this brief analysis, list some possible next steps my client could take, and follow-up questions for me to ask my client.",
          }),
        }
      );

      if (!init_llm_response.ok) {
        throw new Error(
          `HTTP error during legal summary generation! Status: ${init_llm_response.status}`
        );
      }

      console.log("Legal summary generated, redirecting to interview assistant...");
      // Step 5: Redirect to the interview-assistant page
      navigate(`/case/${data.case_id}/interview-assistant`);
    } catch (err) {
      console.error("Error occurred:", err);
      setError(err.message);
    } finally {
      console.log("Submission process completed.");
      setIsSubmitting(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <AppBar position="static" color="primary" elevation={0}>
        <StudentHeader />
      </AppBar>
      <Container sx={{ display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            mt: 8,
            p: 4,
            backgroundColor: "var(--background)",
            color: "var(--text)",
            borderRadius: 3,
            width: "80%",
            border: "1px solid var(--border)",
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "left", mb: 2, fontFamily: "inter" }}>
            Start A New Case
          </Typography>
          <form noValidate autoComplete="off" onSubmit={handleSubmit} >
            <FormControl fullWidth sx={{ mb:2, textAlign: "left", borderColor: "var(--border)",
              borderColor: "var(--border)",
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "var(--border)", // Set border color
                },
                "&.Mui-focused fieldset": {
                  borderColor: "var(--border)", // Set focused border color
                },
                "& input": {
                  color: "var(--text)", // Set input text color
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "var(--placeholder-text)", // Set placeholder text color
                },
              },
            }}>
              <InputLabel sx={{color: 'var(--placeholder-text)'}}>Broad Area of Law</InputLabel>
              <Select
                label="Broad Area of Law"
              sx={{color: 'var(--text)'}}
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
                  "Intellectual Property Law",
                  "Other",
                ].map((area) => (
                  <MenuItem key={area} value={area}>
                    {area}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2, textAlign: "left" }}>
              <FormLabel style={{color: 'var(--text)'}}>Jurisdiction</FormLabel>
              <FormGroup >
                {["Federal", "Provincial"].map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        checked={formData.jurisdiction.includes(option)}
                        onChange={handleChange}
                        name="jurisdiction"
                        value={option}
                        style={{color: 'var(--text)'}}
                      />
                    }
                    label={option}
                  />
                ))}
              </FormGroup>
            </FormControl>

            {formData.jurisdiction.includes("Provincial") && (
              <FormControl fullWidth sx={{ 
  mb: 2, 
  textAlign: "left", 
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--border)", // Correct border color target
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--border)",
  },
  "& .MuiSelect-outlined": {
    color: "var(--text)", // Text color inside select
  }
}}>
  <InputLabel id="province-label" sx={{ color: 'var(--placeholder-text)' }}>
    Province
  </InputLabel>
  <Select
    labelId="province-label"
    label="Province"
    name="province"
    value={formData.province}
    onChange={handleChange}
    sx={{ color: 'var(--text)' }}
  >
    {[
      "Alberta",
      "British Columbia",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Nova Scotia",
      "Ontario",
      "Prince Edward Island",
      "Quebec",
      "Saskatchewan",
      "Northwest Territories",
      "Nunavut",
      "Yukon",
    ].map((province) => (
      <MenuItem key={province} value={province}>
        {province}
      </MenuItem>
    ))}
  </Select>
</FormControl>
            )}
            <div style={{display: "flex", flexDirection: "row", gap: "1rem"}}>

            
<p style={{marginTop: 10, color: 'var(--text)'}}>Statute Applicable?</p>
<RadioGroup
  name="statute"
  value={formData.statute}
  onChange={handleChange}
  row
  sx={{ mb: 2 }}
>
<FormControlLabel 
    value="Yes" 
    control={
      <Radio 
        sx={{
          color: "var(--border)", // Set the default circle color
          "&.Mui-checked": {
            color: "var(--text)", // Set the checked circle color
          },
        }} 
      />
    } 
    label="Yes" 
  />
  <FormControlLabel 
    value="No" 
    control={
      <Radio 
        sx={{
          color: "var(--border)", // Set the default circle color
          "&.Mui-checked": {
            color: "var(--text)", // Set the checked circle color
          },
        }} 
      />
    } 
    label="No" 
  />
</RadioGroup>
</div>
            <TextField
              label="Statute Details"
              name="statuteDetails"
              fullWidth
              variant="outlined"
              value={formData.statuteDetails}
              onChange={handleChange}
              InputLabelProps={{
                sx: {
                  color: "var(--placeholder-text)", // Normal label color
                  "&.Mui-focused": {
                    color: "var(--placeholder-text)", // Focused label color
                  },
                },
              }}
              sx={{ mb: 2 ,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "var(--border)", // Set border color
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "var(--border)", // Set focused border color
                  },
                  "& input": {
                    color: "var(--text)", // Set input text color
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "var(--placeholder-text)", // Set placeholder text color
                  },
                }}}
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
  InputLabelProps={{
    sx: {
      color: "var(--placeholder-text)", // Normal label color
      "&.Mui-focused": {
        color: "var(--placeholder-text)", // Focused label color
      },
    },
  }}
  sx={{
    mb: 2,
    "& .MuiOutlinedInput-root": {
      "& fieldset": {
        borderColor: "var(--border)", // Set border color
      },
      "&.Mui-focused fieldset": {
        borderColor: "var(--border)", // Set focused border color
      },
      // Targeting both input and textarea for multiline fields:
      "& input, & textarea": {
        color: "var(--text)", // Set input text color
        "&::placeholder, &::label": {
          color: "var(--placeholder-text)", // Set placeholder text color
          opacity: 1, // Optional: Ensures full color in some browsers
        },
      },
    },
  }}
/>
            <Button
              variant="contained"
              fullWidth
              color="primary"
              type="submit"
              disabled={isSubmitting}
              sx={{ color: "white", borderRadius: 2, fontFamily: "Outfit", backgroundColor: "var(--secondary)", boxShadow: "none",}}
            >
              {isSubmitting ? "Submitting..." : "Start Interview"}
            </Button>
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </form>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default NewCaseForm;
