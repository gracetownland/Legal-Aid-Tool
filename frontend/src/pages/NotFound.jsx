import React, { useState, useEffect } from "react";
import StudentHeader from "../components/StudentHeader";
import InstructorHeader from "../components/InstructorHeader";
import AdminHeader from "../components/AdminHeader";

const NotFound = () => {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      
    };
    fetchUserRole();
  }, []);

  return (
    <div style={{ padding: "2em", textAlign: "center", fontFamily: "Outfit", display: 'flex', flexDirection: 'column', gap: '1em', color: 'var(--header-text)'}}>
        {/* ((userRole === "student") ? <StudentHeader /> : <InstructorHeader />) */}
        <StudentHeader />
      <h1>Page Not Found</h1>
      <p>Sorry, the page you're looking for doesn't exist.</p>
    </div>
  );
};

export default NotFound;

  