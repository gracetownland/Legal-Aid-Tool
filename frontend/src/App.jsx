import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { CookieStorage } from "aws-amplify/utils";
import "@aws-amplify/ui-react/styles.css";
// react-router
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useEffect, useState, createContext } from "react";
// pages
import Login from "./pages/login";
import StudentHomepage from "./pages/student/StudentHomepage";
//import StudentChat from "./pages/student/StudentChat";
import AdminHomepage from "./pages/admin/AdminHomepage";
import InstructorHomepage from "./pages/instructor/InstructorHomepage";
import  CasePage from "./pages/student/CasePage";
import NewCaseForm from "./pages/student/NewCase";
import ViewAllCases from "./pages/student/AllCases";
import InterviewAssistant from "./pages/student/components/InterviewAssistant";
// import CaseOveriew from "./pages/student/CaseOverview";

export const UserContext = createContext();

Amplify.configure({
  API: {
    REST: {
      MyApi: {
        endpoint: import.meta.env.VITE_API_ENDPOINT,
      },
    },
  },
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      allowGuestAccess: false,
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [userGroup, setUserGroup] = useState(null);
  const [group, setGroup] = useState(null);
  const [patient, setPatient] = useState(null);
  const [isInstructorAsStudent, setIsInstructorAsStudent] = useState(false);

  useEffect(() => {
    const fetchAuthData = () => {
      fetchAuthSession()
        .then(({ tokens }) => {
          if (tokens && tokens.accessToken) {
            const group = tokens.accessToken.payload["cognito:groups"];
            setUser(tokens.accessToken.payload);
            setUserGroup(group || []);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    };

    fetchAuthData();
  }, []);

  const getHomePage = () => {
    if (
      userGroup &&
      (userGroup.includes("admin") || userGroup.includes("techadmin"))
    ) {
      return <AdminHomepage />;
    } else if (userGroup && userGroup.includes("instructor")) {
      if (isInstructorAsStudent) {
        return <StudentHomepage setGroup={setGroup} />;
      } else {
        return <InstructorHomepage />;
      }
    } else if (userGroup && userGroup.includes("student")) {
      return <StudentHomepage setGroup={setGroup} />;
    } else {
      return <Login />;
    }
  };

  return (
    <UserContext.Provider
      value={{ isInstructorAsStudent, setIsInstructorAsStudent }}
    >
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" /> : <Login />}
          />
          {/* <Route
            path="/student_chat/*"
            element={
              <StudentChat
                group={group}
                patient={patient}
                setPatient={setPatient}
                setGroup={setGroup}
              />
            }
          /> */}
          <Route
            path="/case-overview"
            element={
              <CasePage
              //  group={group}
              //  setPatient={setPatient}
              //  setGroup={setGroup}
              />
            }
          />

          <Route
            path="/new-case"
            element={
              <NewCaseForm
              //  group={group}
              //  setPatient={setPatient}
              //  setGroup={setGroup}
              />
            }
          />
          <Route path="/cases" element={<ViewAllCases />} />
          <Route path="/interview" element={<InterviewAssistant />} />
          <Route path="/home/*" element={<StudentHomepage />} />
          <Route path="/group/*" element={<InstructorHomepage />} />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
