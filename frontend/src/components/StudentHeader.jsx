import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// Amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";

const StudentHeader = () => {
  const [name, setName] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [logo, setLogo] = useState("/logo_light.svg"); // Default to light mode
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
              `${
                import.meta.env.VITE_API_ENDPOINT
              }student/get_name?user_email=${encodeURIComponent(email)}`,
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateLogo = () => {
      setLogo(mediaQuery.matches ? "/logo_dark.svg" : "/logo_light.svg");
    };

    updateLogo(); // Set initial value

    mediaQuery.addEventListener("change", updateLogo);

    return () => mediaQuery.removeEventListener("change", updateLogo);
  }, []);

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
<header className="bg-[var(--background2)] p-4 flex justify-between items-center h-20 
             fixed top-0 left-0 w-full z-50 shadow-md border-b-4 border-[var(--border)]">
  <img src={logo} alt="Logo" className="h-12 w-12 mr-4" />
  <div className="text-[var(--text)] text-3xl font-roboto font-semibold p-4">
    {showDashboard && name && `${name}'s Dashboard`}
  </div>
  <div className="flex items-center space-x-4">
    <button
      className="bg-[var(--accent)] text-white hover:bg-gray-700 px-4 py-2 rounded"
      onClick={handleSignOut}
    >
      Sign Out
    </button>
  </div>
</header>

  );
};

export default StudentHeader;
