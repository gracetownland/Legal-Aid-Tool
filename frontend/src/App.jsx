import "./App.css";
// amplify
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
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
import NewCaseForm from "./pages/student/NewCase";
import ViewAllCases from "./pages/student/AllCases";
import InstructorHomepage from "./pages/instructor/InstructorHomepage";
import AdminHomepage from "./pages/admin/AdminHomepage";
import CaseOverview from "./pages/CasePage/CaseOverview";
import InterviewAssistant from "./pages/CasePage/InterviewAssistant";
import PrelimSummary from "./pages/CasePage/PrelimSummary";
import AdminChangeSystemPrompt  from "./pages/admin/AdminChangeSystemPrompt";
import SummariesPage from "./pages/CasePage/CaseSummaries";

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

  useEffect(() => {
    const fetchAuthData = () => {
      fetchAuthSession()
        .then(({ tokens }) => {
          if (tokens && tokens.accessToken) {
            const group = tokens.accessToken.payload["cognito:groups"];
            console.log("User's Groups:", tokens.accessToken);
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
        return <InstructorHomepage />;
    } else if (userGroup && userGroup.includes("student")) {
      return <StudentHomepage />;
    } else {
      return <Login />;
    }
  };

  return (
    <UserContext.Provider
      value={ user }
    >
      <Router>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/home" /> : <Login />}
          />
          <Route path="/new-case" element={<NewCaseForm />} />
          <Route path="/cases" element={<ViewAllCases />} />
          <Route path="/home/*" element={getHomePage()} />
          
          <Route path="/case/:caseId/interview-assistant" element={<InterviewAssistant />} />
          <Route path="/case/:caseId/overview/*" element={<CaseOverview />} />
          <Route path="/case/:caseId/summaries" element={<SummariesPage />} />
          <Route path="/system-prompt" element={<AdminChangeSystemPrompt />} />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
