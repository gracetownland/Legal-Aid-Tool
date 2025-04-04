import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// MUI
import SettingsIcon from "@mui/icons-material/Settings";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assignment";
import TerminalIcon from '@mui/icons-material/Terminal';

// Amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

const AdminHeader = () => {
  const [name, setName] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [logo, setLogo] = useState("/logo_dark.svg"); // Default to light mode
  const navigate = useNavigate();

  useEffect(() => {
    const fetchName = () => {
      fetchAuthSession()
        .then((session) => {
          return fetchUserAttributes().then((userAttributes) => {
            const token = session.tokens.idToken;
            console.log(session.tokens);

            const email = userAttributes.email;
            return fetch(
              `${import.meta.env.VITE_API_ENDPOINT}student/get_name?user_email=${encodeURIComponent(email)}`,
              {
                method: "GET",
                headers: {
                  Authorization: token,
                  "Content-Type": "application/json",
                },
              }
            );
          });
        })
        .then((response) => response.json())
        .then((data) => {
          setName(data.name);
        })
        .catch((error) => {
          console.error("Error fetching name:", error);
        });
    };

    fetchName();
  }, []);

  // useEffect(() => {
  //   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  //   const updateLogo = () => {
  //     setLogo(mediaQuery.matches ? "/logo_dark.svg" : "/logo_light.svg");
  //   };

  //   updateLogo(); // Set initial value

  //   mediaQuery.addEventListener("change", updateLogo);

  //   return () => mediaQuery.removeEventListener("change", updateLogo);
  // }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDashboard(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [name]);

  const handleSignOut = async (event) => {
    event.preventDefault();
    signOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };

  return (
    <header className="bg-[var(--secondary)] p-4 flex justify-between items-center h-20 
             fixed top-0 left-0 w-full z-50 shadow-md">
      <img src={logo} alt="Logo" className="h-12 w-12 mr-4" />
      <div className="flex-grow text-[white] text-3xl font-roboto font-semibold p-4 text-left">
        Admin Control Panel
      </div>
      <div className="flex items-center space-x-4">
      <button 
        onClick={() => navigate("/home/*")} 
        className="flex flex-col items-center bg-transparent text-white hover:text-[#dde] focus:outline-none hover:outline-none"
      >
        <HomeIcon fontSize="large" />
        <span>Home</span>
      </button>

      <button 
        onClick={() => navigate("/system-prompt")} 
        className="flex flex-col items-center bg-transparent text-white hover:text-[#dde] focus:outline-none hover:outline-none"
      >
        <TerminalIcon fontSize="large" />
        <span>System Prompt</span>
      </button>

      <button 
        className="bg-[white] text-[var(--primary)] hover:bg-[#dde] px-4 py-2 rounded focus:outline-none hover:outline-none" 
        onClick={handleSignOut}
      >
        Sign Out
      </button>

      </div>
    </header>
  );
};

export default AdminHeader;
