import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// MUI Icons
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
// Amplify
import { signOut, fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";

const StudentHeader = () => {
  const [name, setName] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [logo, setLogo] = useState("/logo_dark.svg");
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const notificationMenuRef = useRef(null);
  const accountMenuRef = useRef(null);
  const timeoutRef = useRef(null);

  const updateLogoBasedOnTheme = () => {
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setLogo(isDarkMode ? "/logo_dark.svg" : "/logo_light.svg");
  };

  useEffect(() => {
    updateLogoBasedOnTheme();

    const themeChangeListener = (e) => {
      updateLogoBasedOnTheme();
    };
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeChangeListener);

    return () => {
      window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", themeChangeListener);
    };
  }, []);

  useEffect(() => {
    const getNotifications = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const cognito_id = session.tokens.idToken.payload.sub;
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/notifications?user_id=${cognito_id}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("NOTIFICATIONS:", data);
        setNotifications(data.notifications);
      }
      catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    getNotifications();
  }, [notifications]);

  useEffect(() => {
    const fetchName = async () => {
      try {
        const session = await fetchAuthSession();
        const userAttributes = await fetchUserAttributes();
        const token = session.tokens.idToken;
        const email = userAttributes.email;

        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}student/get_name?user_email=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await response.json();
        setName(data.name);
      } catch (error) {
        console.error("Error fetching name:", error);
      }
    };

    fetchName();
  }, []);

  const handleSignOut = async (event) => {
    event.preventDefault();
    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const toggleAccountMenu = () => {
    setIsAccountMenuOpen(!isAccountMenuOpen);
  };

  const getHeaderText = () => {
    switch (location.pathname) {
      case "/home/*":
        return `${name}'s Dashboard`;
      case "/new-case":
        return "New Case";
      case "/cases":
        return "All Cases";
      default:
        return location.pathname.startsWith("/case/") ? "Case Overview" : `${name}'s Dashboard`;
    }
  };

  const handleMouseLeave = (menuType) => {
    timeoutRef.current = setTimeout(() => {
      if (menuType === "notifications") {
        setIsNotificationsOpen(false);
      } else if (menuType === "account") {
        setIsAccountMenuOpen(false);
      }
    }, 300); // Delay to allow user to move mouse back in quickly if needed
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Clear the timeout if mouse re-enters before it closes
    }
  };

  return (
    <header className="bg-[var(--header)] p-4 flex justify-between items-center h-20 fixed top-0 left-0 w-full z-50 shadow-sm">
      <img src={logo} alt="Logo" className="h-12 w-12 mr-4" />
      <h2 className="font-semibold ">Legal Aid Tool</h2>
      <div className="flex-grow text-[var(--header-text)] text-3xl font-medium p-4 text-left">
        {showDashboard && name && getHeaderText()}
      </div>
      <div className="flex items-center space-x-6">
        <button
          onClick={() => navigate("/home/*")}
          className="flex flex-col items-center bg-transparent text-[var(--header-text)] hover:text-gray-600 focus:outline-none transition-all duration-200"
        >
          <HomeIcon fontSize="large" />
          <span className="mt-1">Home</span>
        </button>

        <button
          onClick={() => navigate("/new-case")}
          className="flex flex-col items-center bg-transparent text-[var(--header-text)] hover:text-gray-600 focus:outline-none transition-all duration-200"
        >
          <CreateNewFolderIcon fontSize="large" />
          <span className="mt-1">New Case</span>
        </button>

        <button
          onClick={() => navigate("/cases")}
          className="flex flex-col items-center bg-transparent text-[var(--header-text)] hover:text-gray-600 focus:outline-none transition-all duration-200"
        >
          <AssignmentIcon fontSize="large" />
          <span className="mt-1">All Cases</span>
        </button>

        {/* Notification Bell */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => handleMouseLeave("notifications")}
        >
          <button
            onClick={toggleNotifications}
            className="text-[var(--header-text)] flex flex-col items-center hover:text-gray-600 bg-transparent focus:outline-none transition-all duration-200"
          >
            <NotificationsIcon fontSize="large" />
            <span className="mt-1">Notifications</span>
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-0 top-10 bg-white shadow-lg w-64 p-2 rounded-lg">
              {notifications.length > 0 ? (
                notifications.map((notif, index) => (
                  <div key={index} className="p-2 border-b">
                    {notif}
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-500">No notifications</div>
              )}
            </div>
          )}
        </div>

        {/* Account Menu */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => handleMouseLeave("account")}
        >
          <button
            onClick={toggleAccountMenu}
            className="flex flex-col bg-transparent items-center text-[var(--header-text)] hover:text-gray-600 focus:outline-none transition-all duration-200"
          >
            <AccountCircleIcon fontSize="large" />
            <span className="mt-1">{name}</span>
          </button>
          {isAccountMenuOpen && (
            <div className="absolute right-0 top-10 bg-[var(--background)] shadow-lg w-48 p-2 rounded-lg">
              <button
                onClick={handleSignOut}
                className="w-full text-left p-2 hover:bg-gray-100"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
