import React, { useState, useEffect } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import { fetchAuthSession } from 'aws-amplify/auth';
import { on } from 'events';

export default function Disclaimer({ onClick }) {
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(true);
  const [disclaimerText, setDisclaimerText] = useState("");

  useEffect(() => {
    const fetchDisclaimer = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognito_id = session.tokens.idToken.payload.sub;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_disclaimer?user_id=${cognito_id}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        setDisclaimerText(data?.disclaimer_text || "No disclaimer available.");
      } catch (error) {
        console.error("Error fetching disclaimer:", error);
        setDisclaimerText("Error loading disclaimer.");
      }
    };

    fetchDisclaimer();
  }, []);

  const handleCheckboxChange = (event) => {
    setChecked(event.target.checked);
  };

  const handleClick = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const user_id = session.tokens.idToken.payload.sub;
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}student/disclaimer?user_id=${user_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error accepting disclaimer:", error);
    }
    
    setVisible(false);
    onClick();
  };

  return (
    <div
      className={`flex items-center justify-center h-screen bg-[rgba(0,0,0,0.5)] text-[var(--text)] transition-opacity duration-300 ease-in-out`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex flex-col items-center justify-center w-full max-w-md p-4 bg-[var(--background2)] rounded-lg transition-all duration-300 ease-in-out"
        style={{
          border: '1px solid var(--disclaimer-border)',
          fontFamily: 'Outfit, sans-serif',
          zIndex: 10000,
          position: 'relative',
        }}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--header-text)]">Disclaimer</h2>
        <p className="text-sm text-gray-500 mb-4 text-justify px-4">
          {disclaimerText}
        </p>
        <div>
        <Checkbox
  sx={{
    color: 'var(--text)',
    '&.Mui-checked': {
      color: 'var(--primary)', // Change the checkmark color to var(--primary)
    },
  }}
  onChange={handleCheckboxChange}
/>
I have read and understood the message above.



          <Button
            variant="contained"
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--secondary)] transition-colors"
            onClick={handleClick}
            disabled={!checked}
            sx={{ backgroundColor: 'var(--primary)', color: "white", boxShadow: 'none', fontFamily: "Outfit", marginY: '10px', width: '95%', borderRadius: '10px', '&:hover': { backgroundColor: 'var(--secondary)', boxShadow: 'none' } }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
