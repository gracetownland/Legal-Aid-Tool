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
import { v4 as uuidv4 } from 'uuid';

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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [audioFile, setAudioFile] = useState(null); // Track the uploaded file
  const [step, setStep] = useState("initial"); // To manage form steps
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
    const fileTypeShort = file.type.split("/")[1];
    const normalizedType = fileTypeShort === "mpeg" ? "mp3" : fileTypeShort;
  
    setAudioFile({
      file: file,
      name: fileNameWithoutExtension,
      type: normalizedType,
    });
  
    console.log({
      file: file,
      name: fileNameWithoutExtension,
      type: normalizedType,
    });
  };
  
  const handleJurisdictionChange = (event) => {
    const { value, checked } = event.target;
    
    setFormData((prevState) => ({
      ...prevState,
      jurisdiction: checked
        ? [...prevState.jurisdiction, value]
        : prevState.jurisdiction.filter((item) => item !== value),
    }));
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const caseData = {
      case_title: "New Case", // Temporary placeholder title
      case_type: formData.broadAreaOfLaw,
      jurisdiction: formData.jurisdiction,
      case_description: formData.legalMatterSummary,
    };

    try {
      console.log("Submitting the case...");

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
      console.log(caseData);
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

  const handleAudioPrompt = (answer) => {
    if (answer === "yes") {
      setStep("uploadAudio");
    } else {
      setStep("form");
    }
  };

  const generatePresignedUrl = async (case_id) => {
    try {
      const fileName = audioFile.name;
      // Make sure we're using the correct file type from the original file
      const fileType = audioFile.file.type;
      const fileExtension = audioFile.type;
      
      console.log("Requesting presigned URL with:", {
        case_id,
        fileName,
        fileType,
        fileExtension
      });
      
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/generate_presigned_url?` +
        `case_id=${encodeURIComponent(case_id)}&` +
        `file_name=${encodeURIComponent(fileName)}&` +
        `file_type=${encodeURIComponent(fileExtension)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate presigned URL: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.presignedurl;
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw error;
    }
  };

  const audioToText = async (case_id) => {
    try {
      const fileName = audioFile.name;
      // Make sure we're using the correct file type from the original file
      const fileType = audioFile.file.type;
      const fileExtension = audioFile.type;
      
      console.log("Transcribing with:", {
        case_id,
        fileName,
        fileType,
        fileExtension
      });
      
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken;
      
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/audio_to_text?` +
        `case_id=${encodeURIComponent(case_id)}&` +
        `file_name=${encodeURIComponent(fileName)}&` +
        `file_type=${encodeURIComponent(fileExtension)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to generate presigned URL: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(data);
      return data.text;
    } catch (error) {
      console.error("Error Transcribing:", error);
      throw error;
    }
  };
  // Update the uploadFile function in NewCaseForm.jsx
const uploadFile = async (file, presignedUrl) => {
  try {
    // Use the actual file from the audioFile object
    const fileToUpload = audioFile.file;
    
    console.log("Uploading file with content type:", fileToUpload.type);
    
    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": fileToUpload.type,
      },
      body: fileToUpload,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    console.log(response);
    console.log("Upload successful:", response);
    return response;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};
const handleSubmitWithAudio = async () => {
  if (isUploading) return;
  
  setIsUploading(true);
  setError(null);
  
  try {
    // Step 1: Generate a case ID
    const case_id = uuidv4();
    console.log("Generated case ID:", case_id);
    
    // Step 2: Generate Presigned URL
    const presigned_url = await generatePresignedUrl(case_id);
    console.log("Received presigned URL:", presigned_url);
    
    // Step 3: Upload the file
    await uploadFile(audioFile.file, presigned_url);
    console.log('File uploaded successfully for case:', case_id);
    
    try {
      const transcribedText = await audioToText(case_id);
      console.log("Transcription completed:", transcribedText);
    } catch (transcriptionError) {
      console.error("Transcription error:", transcriptionError);
      // Log the error but don't block continuation
    }
    
    // Add a 10-second wait after audio to text function
    console.log("Waiting 120 seconds for processing...");
    await new Promise(resolve => setTimeout(resolve, 120000));
    console.log("Wait completed, proceeding with next steps");
    
    const { tokens } = await fetchAuthSession();
    const token = tokens.idToken;
    
    try {
      const init_llm_response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/text_generation?case_id=${case_id}&audio_flag=true`,
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
        console.error(`HTTP error during legal summary generation! Status: ${init_llm_response.status}`);
        // Log error but continue execution
      } else {
        console.log("Legal summary generated, redirecting to interview assistant...");
      }
    } catch (summaryError) {
      console.error("Error generating legal summary:", summaryError);
      // Log error but continue execution
    }
    
    // Step 4: Navigate to the next step or display success regardless of previous errors
    navigate(`/case/${case_id}/interview-assistant`);
  } catch (error) {
    console.error("Upload error:", error);
    setError(error.message || "Failed to upload audio file");
  } finally {
    setIsUploading(false);
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
          {step === "initial" && (
            <Box>
              <Typography variant="h5" sx={{ textAlign: "left", mb: 2 }}>
                Would you like to upload an audio file?
              </Typography>
              <Button variant="contained" onClick={() => handleAudioPrompt("yes")} sx={{ mr: 2 }}>
                Yes
              </Button>
              <Button variant="contained" onClick={() => handleAudioPrompt("no")}>
                No
              </Button>
            </Box>
          )}

          {step === "uploadAudio" && (
            <Box>
              <Typography variant="h5" sx={{ textAlign: "left", mb: 2 }}>
                Upload an Audio File
              </Typography>
              <input type="file" accept="audio/*" onChange={handleFileUpload} />
              <Button
                variant="contained"
                fullWidth
                color="primary"
                onClick={handleSubmitWithAudio}
                disabled={isSubmitting || !audioFile}
                sx={{ mt: 2 }}
              >
                Start Interview
              </Button>
            </Box>
          )}

          {step === "form" && (
            <form noValidate autoComplete="off" onSubmit={handleSubmit}>
              <Typography variant="h5" sx={{ textAlign: "left", mb: 2 }}>
                Start A New Case
              </Typography>

              <FormControl fullWidth sx={{ mb: 2, textAlign: "left" }}>
                <InputLabel>Broad Area of Law</InputLabel>
                <Select
                  name="broadAreaOfLaw"
                  value={formData.broadAreaOfLaw}
                  onChange={handleChange}
                  required
                >
                  {["Criminal Law", "Civil Law", "Family Law", "Business Law", "Other"].map((area) => (
                    <MenuItem key={area} value={area}>
                      {area}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Jurisdiction Field */}
<FormControl fullWidth sx={{ mb: 2, textAlign: "left" }}>
  <FormLabel>Jurisdiction</FormLabel>
  <FormGroup>
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.jurisdiction.includes("Provincial")}
          onChange={handleJurisdictionChange}
          name="jurisdiction"
          value="Provincial"
        />
      }
      label="Provincial"
    />
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.jurisdiction.includes("Federal")}
          onChange={handleJurisdictionChange}
          name="jurisdiction"
          value="Federal"
        />
      }
      label="Federal"
    />
  </FormGroup>
</FormControl>

{/* Conditional Province Dropdown */}
{formData.jurisdiction.includes("Provincial") && (
  <FormControl fullWidth sx={{ mb: 2, textAlign: "left" }}>
    <InputLabel>Province</InputLabel>
    <Select
      name="province"
      value={formData.province}
      onChange={handleChange}
      required
    >
      {[
        "Ontario", "British Columbia", "Alberta", "Quebec", "Manitoba", "Saskatchewan", "Nova Scotia", 
        "New Brunswick", "Prince Edward Island", "Newfoundland and Labrador", "Northwest Territories", 
        "Yukon", "Nunavut"
      ].map((province) => (
        <MenuItem key={province} value={province}>
          {province}
        </MenuItem>
      ))}
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
              <Button
                variant="contained"
                fullWidth
                color="primary"
                type="submit"
                disabled={isSubmitting}
                sx={{ color: "white" }}
              >
                {isSubmitting ? "Submitting..." : "Start Interview"}
              </Button>
              {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
            </form>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default NewCaseForm;
