import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
//import {jwt } from 'jsonwebtoken';

// MUI
import SettingsIcon from "@mui/icons-material/Settings";
// amplify
import { signOut } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchUserAttributes } from "aws-amplify/auth";
import { UserContext } from "../App";

const StudentHeader = () => {
  const [name, setName] = useState("");
  const [showDashboard, setShowDashboard] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchName = () => {
      fetchAuthSession()
        .then((session) => {
          return fetchUserAttributes().then((userAttributes) => {
            const token = session.tokens.idToken;
            console.log( session.tokens);

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
    // Introduce a delay before showing the dashboard text
    const timer = setTimeout(() => {
      setShowDashboard(true);
    }, 0); // Set delay in milliseconds (2000ms = 2 seconds)

    // Clean up the timer when the component unmounts
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
    <header className="bg-[#F8F9FD] p-4 flex justify-between items-center max-h-20" style={{ paddingLeft: "15px", paddingRight: "40px" }}>
      <div className="text-black text-3xl font-roboto font-semibold p-4">
        {showDashboard && name && `${name}'s Dashboard`} {/* Display the text after the delay */}
      </div>
      <div className="flex items-center space-x-4">
        <button
          className="bg-gray-800 text-white hover:bg-gray-700 px-4 py-2 rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default StudentHeader;