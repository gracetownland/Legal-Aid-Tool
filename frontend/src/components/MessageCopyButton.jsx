import React, { useState } from "react";
import Button from "@mui/material/Button";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const MessageCopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    if (!copied) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  return (
    <Button
      size="small"
      disableRipple
      onClick={handleCopyClick}
      disabled={copied}  // Disable during the copied state if desired
      sx={{
        minWidth: 30,
        width: 30,
        height: 30,
        p: 0,
        ml: 2,
        color: "#808080",
        backgroundColor: "transparent",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        "&:focus": {
          outline: "none",
          boxShadow: "none",
        },
        "&:hover": {
          backgroundColor: "transparent",
          color: "var(--text)",
        },
      }}
    >
      {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="extrasmall" />}
    </Button>
  );
};

export default MessageCopyButton;