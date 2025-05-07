import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Button,
  TextField,
  Card,
  Typography,
  CircularProgress
} from "@mui/material";
import AdminHeader from "../../components/AdminHeader";

export default function Disclaimer() {
  const [currentDisclaimer, setCurrentDisclaimer] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDisclaimer = async () => {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}admin/disclaimer`, {
        method: "GET",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log(data);
      if (data?.disclaimer_text) {
        setCurrentDisclaimer(data.disclaimer_text);
        setLastUpdated(data.last_updated);
        setUpdatedBy(`${data.first_name} ${data.last_name}`);
      }
    } catch (err) {
      console.error("Failed to fetch disclaimer:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveDisclaimer = async () => {
    setSaving(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const cognito_id = session.tokens.idToken.payload.sub;

      await fetch(`${import.meta.env.VITE_API_ENDPOINT}admin/disclaimer?cognito_id=${cognito_id}`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ disclaimer_text: currentDisclaimer }),
      });

      await fetchDisclaimer();
    } catch (err) {
      console.error("Failed to save disclaimer:", err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDisclaimer();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <AdminHeader />
      <Card
        sx={{
          marginTop: 10,
          padding: 3,
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
        }}
      >
        <Typography variant="h5" gutterBottom>
          <strong>Current Disclaimer</strong>
        </Typography>

        {lastUpdated && (
          <Typography
            variant="caption"
            sx={{ color: "#888", marginBottom: 1, display: "block" }}
          >
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{ marginBottom: 2, color: "var(--text-light)" }}
        >
          This text appears at the start of every page in the application.
          Editing it will update the live disclaimer.
        </Typography>

        <TextField
          value={currentDisclaimer}
          onChange={(e) => setCurrentDisclaimer(e.target.value)}
          fullWidth
          multiline
          rows={6}
          variant="outlined"
        />

        <Button
          onClick={saveDisclaimer}
          disabled={saving}
          sx={{
            marginTop: 2,
            backgroundColor: "var(--secondary)",
            color: "white",
            "&:hover": { backgroundColor: "var(--primary)" },
          }}
        >
          {saving ? "Saving..." : "Save Disclaimer"}
        </Button>
      </Card>
    </div>
  );
}
