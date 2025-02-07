// components
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "../../components/AdminHeader";
import AdminInstructors from "./AdminInstructors";
import AdminSimulationGroups from "./AdminSimulationGroups";
import AdminCreateSimulationGroup from "./AdminCreateSimulationGroup";
import PageContainer from "../Container";
import InstructorDetails from "./InstructorDetails";
import GroupDetails from "./GroupDetails";
// MUI
import { AppBar } from "@mui/material";
import { useState } from "react";

export const AdminHomepage = () => {
  const [selectedComponent, setSelectedComponent] =
    useState("AdminInstructors");
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // sidebar routing
  const renderComponent = () => {
    if (selectedInstructor) {
      return (
        <InstructorDetails
          instructorData={selectedInstructor.row}
          onBack={() => setSelectedInstructor(null)}
        />
      );
    }
    if (selectedGroup) {
      return (
        <GroupDetails
          group={selectedGroup.row}
          onBack={() => setSelectedGroup(null)}
        />
      );
    }
    switch (selectedComponent) {
      case "AdminInstructors":
        return (
          <AdminInstructors setSelectedInstructor={setSelectedInstructor} />
        );
      case "AdminSimulationGroups":
        return <AdminSimulationGroups setSelectedGroup={setSelectedGroup} />;
      case "AdminCreateSimulationGroup":
        return (
          <AdminCreateSimulationGroup setSelectedComponent={setSelectedComponent} />
        );
      default:
        return (
          <AdminInstructors setSelectedInstructor={setSelectedInstructor} />
        );
    }
  };

  return (
    <div>
      <PageContainer>
        <AppBar
          position="fixed"
          sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
          elevation={1}
        >
          <AdminHeader />
        </AppBar>
        <AdminSidebar
          setSelectedComponent={setSelectedComponent}
          setSelectedInstructor={setSelectedInstructor}
          setSelectedGroup={setSelectedGroup}
        />
        {renderComponent()}
      </PageContainer>
    </div>
  );
};

export default AdminHomepage;