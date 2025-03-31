import { Box, Paper } from "@mui/material";

const TypingIndicator = () => (
    <Box sx={{ overflowY: "auto", marginBottom: 2 }}>
            <Paper
              sx={{
                maxWidth: "fit-content",
                padding: 2,
                backgroundColor: "var(--bot-text)",
                borderRadius: 2,
                boxShadow: 1,
                marginLeft: 0,
                marginRight: "auto",
                color: "var(--text)",
                fontFamily: "'Roboto', sans-serif",
                boxShadow: 'none',
                overflow: 'hidden'
              }}
            >
              <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                </div>
            </Paper>
      </Box>
  );
  
  export default TypingIndicator;