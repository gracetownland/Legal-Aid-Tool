import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Button, TextField, Card, CardContent, Typography, IconButton } from "@mui/material";
import AdminHeader from "../../components/AdminHeader";
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { use } from "react";

export default function EditSystemPrompts() {
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [previousPrompts, setPreviousPrompts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchCurrentPrompts = async () => {
    const session = await fetchAuthSession();
    var token = session.tokens.idToken
    const prompt = await fetch(
      `${import.meta.env.VITE_API_ENDPOINT}admin/prompt`,
      {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await prompt.json();
    return data;
  };

  const fetchAndSetPrompts = async () => {
    setLoading(true);
    const allprompts = await fetchCurrentPrompts();
    console.log("All prompts:", allprompts);
    
    if (allprompts.length > 0) {
      setCurrentPrompt(allprompts[0].prompt);
      setPreviousPrompts(allprompts.slice(1));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSetPrompts();
  }, []);

  const savePrompt = async () => {
    setSaving(true);

    const session = await fetchAuthSession();
    var token = session.tokens.idToken
    const response = await fetch(
      `${import.meta.env.VITE_API_ENDPOINT}admin/prompt`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_prompt: currentPrompt,
        }),
      }
    );

    fetchAndSetPrompts();
    
    setSaving(false);
  };

  const restorePrompt = async () => {
    setRestoring(true);

    const session = await fetchAuthSession();
    var token = session.tokens.idToken
    const response = await fetch(
      `${import.meta.env.VITE_API_ENDPOINT}admin/prompt`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_prompt: previousPrompts[currentIndex].prompt,
        }),
      }
    );

    fetchAndSetPrompts();
    
    setRestoring(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <AdminHeader />

      {/* Current Prompt */}
      <Card sx={{ 
        marginTop: '80px', 
        background: "transparent", 
        color: "var(--text)", 
        border: "1px solid var(--border)", 
        boxShadow: 'none',
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px' 
      }}>
        <div style={{ textAlign: 'left', color: 'var(--text)', margin: '17px' }}>
          <h1 style={{ fontSize: '30px' }}><strong>Current System Prompt</strong></h1>
          <p>This controls the instructions given to the AI assistant. Changing it will change its behaviour for <strong>all users.</strong></p>
        </div>

        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <TextField
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            fullWidth
            multiline
            autoFocus
            variant="outlined"
            sx={{
              minHeight: "50px", 
              maxHeight: "none", 
              overflow: "hidden",
              padding: "10px",
              "& .MuiOutlinedInput-root": {
                borderColor: "var(--border)",
              },
              "& .MuiInputBase-input": {
                color: "var(--text)",
                lineHeight: 1.5,
                display: "block",
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
                "&:hover": { backgroundColor: "var(--primary)", opacity: 0.8 },
                "&:disabled": { backgroundColor: "var(--border)" }
              }}
            >
              {saving ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previousPrompts.length > 0 ? (
        <Card sx={{ 
          background: "transparent", 
          color: "var(--text)", 
          marginTop: '20px',
          border: "1px solid var(--border)", 
          boxShadow: 'none',
          alignItems: 'center',          
          padding: "10px",
          textAlign: 'left',
        }}>
           {/* History Navigation */}
           <h1 style={{ fontSize: '30px', margin: '10px' }}><strong>Previous System Prompt</strong></h1>
        <Card sx={{ 
          background: "transparent", 
          color: "var(--text)", 
          border: "1px solid var(--border)", 
          boxShadow: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <IconButton 
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            sx={{
              color: "var(--text)",
              "&:disabled": { color: "var(--border)" }
            }}
          >
            <ArrowBackIosIcon />
          </IconButton>

          <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "var(--text-light)", marginTop: "5px", display: "block" }}>
              {previousPrompts[currentIndex].time_created}
            </Typography>

            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {previousPrompts[currentIndex].prompt}
            </Typography>
            
          </CardContent>

          <IconButton 
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, previousPrompts.length - 1))}
            disabled={currentIndex === previousPrompts.length - 1}
            sx={{
              color: "var(--text)",
              "&:disabled": { color: "var(--border)" }
            }}
          >
            <ArrowForwardIosIcon />
          </IconButton>
        
        </Card>
        <div>       
        <Button
              onClick={restorePrompt}
              disabled={saving}
              sx={{
                backgroundColor: "var(--secondary)",
                color: "white",
                height: "40px",
                width: "100%",
                marginTop: "25px",
                marginBottom: "10px",
          
              }}
            >
              {restoring ? "Restoring..." : "Restore Prompt"}
            </Button>
            </div>
        </Card>
        
      ) : (
        <Typography variant="body1" sx={{ color: "#808080", textAlign: "center", marginTop: "20px" }}>
          No previous prompts available.
        </Typography>
        
      )}
      
    </div>
  );
}
