import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import Home from "@mui/icons-material/Home";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        padding: "2em",
        textAlign: "center",
        fontFamily: "Outfit",
        display: "flex",
        flexDirection: "column",
        gap: "1.5em",
        color: "var(--header-text)",
        alignItems: "center",
      }}
    >
      <h1>Page Not Found</h1>
      <p>Sorry, the page you're looking for doesn't exist.</p>
      <Button
        onClick={() => navigate("/home")}
        variant="filled"
        sx={{
          backgroundColor: "var(--primary)",
          width: "12em",
          borderRadius: "2em",
          color: "white",
          fontFamily: "Outfit",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "var(--secondary)",
          },
        }}
        startIcon={<Home />}
        
      >
        Back to Home
      </Button>
    </div>
  );
};

export default NotFound;

  