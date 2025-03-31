import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Button, TextField, Card, CardContent, Typography, IconButton } from "@mui/material";
import StudentHeader from "../../components/StudentHeader";
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

export default function EditSystemPrompts() {
  const [currentPrompt, setCurrentPrompt] = useState("This is the current prompt...");
  const [previousPrompts, setPreviousPrompts] = useState([
    { text: "Previous prompt 1", timestamp: "March 30, 2025 14:23" },
    { text: "Previous prompt 2", timestamp: "March 29, 2025 10:15" },
    { text: "Previous prompt 3", timestamp: "March 28, 2025 18:42" }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
  }, []);

  const savePrompt = async () => {
    setSaving(true);

    setTimeout(() => {
      const newHistory = { text: currentPrompt, timestamp: new Date().toLocaleString() };
      setPreviousPrompts([newHistory, ...previousPrompts]); 
      setCurrentIndex(0); // Reset to most recent
      console.log("Prompt updated successfully");
      setSaving(false);
    }, 1000);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <StudentHeader />

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
                "&:hover": { backgroundColor: "var(--background3)", opacity: 0.8 },
                "&:disabled": { backgroundColor: "var(--border)" }
              }}
            >
              <HistoryIcon sx={{ fontSize: "20px" }} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {previousPrompts.length > 0 ? (
        <Card sx={{ 
          background: "transparent", 
          color: "var(--text)", 
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
              {previousPrompts[currentIndex].timestamp}
            </Typography>

            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {previousPrompts[currentIndex].text}
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
              onClick={savePrompt}
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
              {saving ? "Restoring..." : "Restore Prompt"}
            </Button>
            </div>
        </Card>
        
      ) : (
        <Typography variant="body1" sx={{ color: "var(--text-light)", textAlign: "center" }}>
          No previous prompts available.
        </Typography>
        
      )}
      
    </div>
  );
}
