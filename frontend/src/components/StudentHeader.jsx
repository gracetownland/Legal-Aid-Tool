import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// MUI Icons
import HomeIcon from "@mui/icons-material/Home";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonIcon from '@mui/icons-material/Person';
import Notification from "./Notification";
// Amplify
import { signOut, fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Divider } from "@mui/material";

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
        setNotifications(data);
      }
      catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    getNotifications();
  }, []);

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
    <header
  className="bg-[var(--header)] p-4 flex justify-between items-center h-20 fixed top-0 left-0 w-full z-50 shadow-sm"
  style={{ fontFamily: 'Outfit, sans-serif' }}
>
      <img src={logo} alt="Logo" className="h-14 w-14 mr-4" />
      <h2 className="font-semibold text-xl text-[var(--header-text)]" >Legal Aid Tool</h2>
      <div className="flex-grow text-[var(--header-text)] text-3xl font-medium p-4 text-left">
        {/* spacer */}
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

        <div className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => handleMouseLeave("notifications")}>
          <button
            onClick={toggleNotifications}
            className="text-[var(--header-text)] flex flex-col items-center hover:text-gray-600 bg-transparent focus:outline-none transition-all duration-200"
          >
            <NotificationsIcon fontSize="large" />
            <span className="mt-1">Notifications</span>
          </button>
          {notifications.length > 0 && (
            <span className="absolute top-4 right-15 transform translate-x-1/3 -translate-y-1/3 inline-flex items-center justify-center px-1 py-0 text-xs font-regular text-white bg-red-600 rounded-full">
              {notifications.length}
            </span>
          )}
          {isNotificationsOpen && (
            <div
              className="absolute bg-[var(--background)] right-0 shadow-lg rounded-lg border border-[var(--border)] z-50"
              style={{ maxWidth: "32rem" }}
              ref={notificationMenuRef}
            >
              <h2 className="mx-4 py-2 text-[var(--text)] text-left">Notifications</h2>
              <Divider className="my-2" style={{ borderColor: "var(--border)" }} />
              <div style={{ maxHeight: "75vh", overflowY: "auto" }} className="overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif, index) => (
                    <div key={index} className="m-0 p-0">
                      <Notification
                        title={notif.case_title}
                        content={notif.message_content}
                        date={notif.time_sent}
                        case_id={notif.case_id}
                        instructor_name={notif.instructor_name}
                      />
                    </div>
                  ))
                ) : (
                  <div className="m-0 p-2 text-gray-500 text-center w-96 p-10">No notifications</div>
                )}
              </div>
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
            <div className="absolute right-0 bg-[var(--background)] shadow-lg w-48 p-2 rounded-lg">
              <button
                onClick={handleSignOut}
                className="w-full text-left p-2 bg-[var(--background)] hover:bg-[var(--background2)]"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
