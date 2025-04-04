import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
// amplify
import { signOut } from "aws-amplify/auth";
import { UserContext } from "../App";
import HomeIcon from '@mui/icons-material/Home';

const InstructorHeader = () => {
  const navigate = useNavigate();
  const { setIsInstructorAsStudent } = useContext(UserContext);
  
    const [logo, setLogo] = useState("/logo_dark.svg"); // Default to light mode

  const handleSignOut = (event) => {
    event.preventDefault();
    signOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out: ", error);
      });
  };

  // This will set the context value to true (i.e., switch to "Instructor as Student" mode)
  const handleViewAsStudent = () => {
    setIsInstructorAsStudent(true);
  };

  return (
    <header className="bg-[var(--secondary)] p-4 flex justify-between items-center h-20 
             fixed top-0 left-0 w-full z-50 shadow-md">
              <div className="flex row">
      <img src={logo} alt="Logo" className="h-12 w-12 mr-4" />
      <div className="flex-grow text-[white] text-3xl font-inter font-normal p-4 text-left">Instructor</div>
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
          type="button"
          className="bg-gray-800 text-white hover:bg-gray-700 px-4 py-2 rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default InstructorHeader;
