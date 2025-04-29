import React, { useState, useEffect } from 'react';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';

export default function Disclaimer({ onClick }) {
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleCheckboxChange = (event) => {
    setChecked(event.target.checked);
  };

  const handleClick = () => {
    setVisible(false);
    setTimeout(() => {
      onClick();
    }, 100);
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
          This is a tool designed to help Allard students in a clinical setting analyze the case before them and develop areas for legal and factual inquiry.  
          <br /> <br />
          This tool is <strong>not</strong> meant to answer your clients’ questions – only you with the help of your supervisor can do that. It was not designed to provide legal advice, definitively respond to any legal issue or set of circumstances or provide all of the relevant law.  <br /> <br />
          Any legal or factual information provided by the tool needs to be independently verified by you, especially cases and their correct citations.  Users need to assume that the information provided may have errors, be out of date, or be missing relevant legal or factual analysis. 
          <br /> <br />
          This tool can be a very useful starting place, prompt or supplemental tool for your research, but is <strong>never on its own an adequate basis</strong> for your analysis of the law or relevant facts of the case. 
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
