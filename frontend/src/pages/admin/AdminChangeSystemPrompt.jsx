import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Button, TextField, Card, CardContent, CardHeader, Typography } from "@mui/material";
import StudentHeader from "../../components/StudentHeader";
import HistoryIcon from '@mui/icons-material/History'

export default function EditSystemPrompts() {
  const [currentPrompt, setCurrentPrompt] = useState("This is the current prompt...");
  const [previousPrompts, setPreviousPrompts] = useState(["Previous prompt 1", "Previous prompt 2", "Previous prompt 3"]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {

    const fetchCurrentPrompt = async () => {
      
      const token = tokens.idToken;

      const prompt = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/get_prompt`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(caseData),
        }
      );
    };

    setLoading(true);
    fetchCurrentPrompt();
    setLoading(false);

    setCurrentPrompt(`You are a helpful assistant to me, a UBC law student, who answers with kindness while being concise, so that it is easy to read your responses quickly yet still get valuable information from them. No need to be conversational, just skip to talking about the content. Refer to me, the law student, in the second person. You will be provided with context to a legal case  is interviewing a client about, and you exist to help provide legal context and analysis, relevant issues, possible strategies to defend the client, etc. to the law student when they provide you with context on certain client cases, and you should provide possible follow-up questions for me, the law student, to ask the client to help progress the case more after your initial (concise and easy to read) analysis. These are NOT for the client to ask a lawyer; this is to help me, the law student, learn what kind of questions to ask my client, so you should only provide follow-up questions for me, the law student, to ask the client as if I were a lawyer. You may also mention certain legal information and implications that I, the law student, may have missed, and mention which part of Canadian law it is applicable too if possible or helpful. You are NOT allowed hallucinate, informational accuracy is important.`)

  }, []);

  const savePrompt = async () => {
    setSaving(true);
    setTimeout(() => {
      console.log("Prompt updated successfully");
      setSaving(false);
    }, 1000);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <StudentHeader />
      <Card sx={{ marginTop: '80px', background: "transparent", color: "var(--text)", border: "1px solid var(--border)", boxShadow: 'none'}}>
        <div className="items-left" style={{textAlign: 'left', color: 'var(--text)', marginLeft: '17px', marginTop: '17px'}}>
          <h1 style={{fontSize: '30px'}}><strong>Current System Prompt</strong></h1> 
          <br/>
          <p>This controls the instructions given to the AI assistant. Changing it will change its behaviour for <strong>all users.</strong></p>
        </div>
        <CardContent>
          <TextField
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            fullWidth
            multiline
            variant="outlined"
            sx={{
              maxHeight: "40vh", 
              resize: "none", 
              marginBottom: "20px", 
              overflow: "auto", 
              "& .MuiOutlinedInput-root": {
                borderColor: "var(--border)", 
              },
              "& .MuiInputBase-input": {
                color: "var(--text)", 
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "var(--border)", 
              }
            }}
          />

          <div style={{ display: 'flex', width: '100%' }}>
            <Button
              onClick={savePrompt}
              disabled={saving}
              sx={{
                backgroundColor: "var(--secondary)", 
                color: "white", 
                flexGrow: 1, 
                height: "40px", 
                "&:hover": {
                  backgroundColor: "var(--primary)", 
                  opacity: 0.8, 
                },
                "&:disabled": {
                  backgroundColor: "var(--border)", 
                }
              }}
            >
              {saving ? "Saving..." : "Save Prompt"}
            </Button>

            <Button
              disabled={saving}
              sx={{
                width: "50px", 
                height: "40px", 
                backgroundColor: "var(--background3)", 
                color: "var(--text)", 
                marginLeft: "10px", 
                display: "flex",
                justifyContent: "center", 
                alignItems: "center", 
                "&:hover": {
                  backgroundColor: "var(--background3)", 
                  opacity: 0.8, 
                },
                "&:disabled": {
                  backgroundColor: "var(--border)", 
                }
              }}
            >
              <HistoryIcon sx={{ fontSize: "20px" }} />
            </Button>
          </div>
        </CardContent>
      </Card> 
    </div>
  );
}
