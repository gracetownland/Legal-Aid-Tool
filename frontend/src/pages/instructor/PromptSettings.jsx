import React, { useEffect, useState, useContext } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Toolbar,
} from "@mui/material";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { toast, ToastContainer } from "react-toastify";
import MobileStepper from "@mui/material/MobileStepper";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { useTheme } from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../App";

const CHARACTER_LIMIT = 1000;
function groupTitleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  const words = str.split(" ");
  return words
    .map((word, index) => {
      if (index === 0) {
        return word.toUpperCase();
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
    })
    .join(" ");
}

const PromptSettings = ({ groupName, simulation_group_id }) => {
  const theme = useTheme();
  const [userPrompt, setUserPrompt] = useState("");
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = previousPrompts.length;
  const { isInstructorAsStudent } = useContext(UserContext);
  const navigate = useNavigate();

  const case_examples = `Our hope is that an AI tool used by a student in these scenarios would not attempt to “solve” the issue, as legal matters have infinitely possible outcomes which can be based on many criteria including the personal circumstances of the client.  It would be great however if the tool could provide the student with insights about the legal and factual issues which may be engaged in these circumstances.  This would then help the students think about what legal issues to further research and what factual issues they should be investigating.      
        
      Hopefully the tool can gather information which sets out the “essential elements” of proving the offence or defense at hand. For example, in an assault case, it may be good to consider (remember, this is an example, the client has NOT gone through this made up scenario) :
      application of force, 
      intent to apply force, 
      victim not consenting to force, 
      and that harm that is more than trifling
      
      Great additional insights provided by the tool would be things like : 
      
      -assault is an included offence of assault causing bodily harm
      
      -whether there is potential defence of self-defence and consent (and maybe set out the requirements of those defences)
      
      -if intoxication is involved, evaluate whether the intoxication is a relevant issue, or if it's likely not a relevant issue
      
      -bring up critical factual issues in terms of who started the physical altercation and the level of force used by the accused
      
      By letting the student know about the legal issues, it would likely help the students assess both the case and the factual issues which are relevant.  Even if it just provided basic legal frameworks the students should be looking at for this offence that would be helpful.
      
      
      Example 2 : 
      
      
      In a potentail divorce case (remember, this is an example, the client has NOT gone through this made up scenario)
      
      
      LLM should ideally:  
      
      
      provide some broader information, such as:
      
      emergency court applications which are available for a person in relevant circumstances if applicable
      
      the basic legal rights of the client and potential children, if any, in the circumstances and
      
      maybe even some community resources able to assist in the circumstances`


  const system_prompt = `You are a helpful assistant to me, a UBC law student, who answers
       with kindness while being concise, so that it is easy to read your
       responses quickly yet still get valuable information from them. No need
       to be conversational, just skip to talking about the content. Refer to me,
       the law student, in the second person. I will provide you with context to
       a legal case I am interviewing my client about, and you exist to help provide 
       legal context and analysis, relevant issues, possible strategies to defend the
       client, and other important details in a structured natural language response.
       to me, the law student, when I provide you with context on certain
       client cases, and you should provide possible follow-up questions for me, the
       law student, to ask the client to help progress the case more after your initial
       (concise and easy to read) analysis. These are NOT for the client to ask a lawyer;
       this is to help me, the law student, learn what kind of questions to ask my client,
       so you should only provide follow-up questions for me, the law student, to ask the
       client as if I were a lawyer. You may also mention certain legal information and 
       implications that I, the law student, may have missed, and mention which part of 
       Canadian law it is applicable too if possible or helpful. You are NOT allowed hallucinate, 
       informational accuracy is important. If you are asked something for which you do not know, either
       say "I don't know" or ask for further information if applicable and not an invasion of privacy.
       
       Case Examples : ${case_examples}
       `

  useEffect(() => {
    if (isInstructorAsStudent) {
      navigate("/");
    }
  }, [isInstructorAsStudent, navigate]);

  // Function to convert UTC timestamp to local time
  const convertToLocalTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // or use .toLocaleDateString() and .toLocaleTimeString() for custom formatting
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const fetchPreviousPrompts = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken
      const { email } = await fetchUserAttributes();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/previous_prompts?simulation_group_id=${encodeURIComponent(
          simulation_group_id
        )}&instructor_email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPreviousPrompts(data);
      } else {
        console.error("Failed to fetch previous prompts:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching previous prompts:", error);
    }
  };

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/get_prompt?simulation_group_id=${encodeURIComponent(simulation_group_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setUserPrompt(data.system_prompt);
        } else {
          console.error("Failed to fetch prompt:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching prompt:", error);
      }
    };

    fetchPrompt();
    fetchPreviousPrompts();
  }, [simulation_group_id]);

  const handleSave = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken
      const { email } = await fetchUserAttributes();

      // Save current prompt and fetch previous prompts
      const requestBody = {
        prompt: `${userPrompt}`,
      };
      const response = await fetch(
        `${
          import.meta.env.VITE_API_ENDPOINT
        }instructor/prompt?simulation_group_id=${encodeURIComponent(
          simulation_group_id
        )}&instructor_email=${encodeURIComponent(email)}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const newPrompt = {
          timestamp: new Date().toISOString(),
          previous_prompt: userPrompt,
        };
        setUserPrompt(data.system_prompt);
        fetchPreviousPrompts();
        toast.success("Prompt Updated successfully", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      } else {
        console.error("Failed to update prompt:", response.statusText);
        toast.error(`Failed to update prompt: ${response.statusText}`, {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error updating prompt:", error);
    }
  };

  return (
    <Container sx={{ maxHeight: "100vh", overflow: "auto", padding: 2 }}>
      <Toolbar />
      <Paper
        sx={{
          width: "100%",
          overflow: "auto",
          marginTop: 4,
          padding: 2,
        }}
      >
        <Box mb={1} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
          <Typography
            color="black"
            fontStyle="semibold"
            textAlign="left"
            variant="h6"
            gutterBottom
          >
            {groupTitleCase(groupName)} Prompt Settings
          </Typography>
          <Typography variant="h8">
            Changes to the prompt will be applied to the LLM for this specific
            simulation group.
          </Typography>
          <Typography variant="h6">
            <br />
            Example
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={system_prompt}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            margin="normal"
          />
        </Box>

        <Box mb={1} sx={{ flexGrow: 1, p: 3, textAlign: "left" }}>
          <Typography variant="h6">Your Prompt</Typography>
          <Typography variant="h8">
            Warning:
            <br />
            Modifying the prompt in the text area below can significantly impact
            the quality and accuracy of the responses.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            variant="outlined"
            margin="normal"
            inputProps={{ maxLength: 1000 }}
            helperText={`${userPrompt.length}/${CHARACTER_LIMIT}`}
          />
        </Box>

        <Box mb={1}>
          <Typography variant="h6">Previous Prompts</Typography>
          <MobileStepper
            steps={previousPrompts.length}
            position="static"
            activeStep={activeStep}
            nextButton={
              <Button
                size="small"
                onClick={() => setActiveStep((prev) => prev + 1)}
                disabled={activeStep === previousPrompts.length - 1}
              >
                Next
                <KeyboardArrowRight />
              </Button>
            }
            backButton={
              <Button
                size="small"
                onClick={() => setActiveStep((prev) => prev - 1)}
                disabled={activeStep === 0}
              >
                <KeyboardArrowLeft />
                Back
              </Button>
            }
          />
          <Box sx={{ p: 2 }}>
            {previousPrompts.length === 0 ? (
              <Typography variant="body1">No previous prompts</Typography>
            ) : (
              <>
                <Typography variant="body1">
                  {previousPrompts[activeStep]?.previous_prompt}
                </Typography>
                {convertToLocalTime(previousPrompts[activeStep]?.timestamp) && (
                  <Typography variant="body2">
                    {convertToLocalTime(previousPrompts[activeStep]?.timestamp)}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            width="100%"
          >
            Save
          </Button>
        </Box>
      </Paper>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Container>
  );
};
export default PromptSettings;
