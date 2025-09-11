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
import AIControlPanel  from "./pages/admin/AdminAIControlPanel";
import SummariesPage from "./pages/CasePage/CaseSummaries";
import CaseFeedback from "./pages/CasePage/CaseFeedback";
import Transcriptions from "./pages/CasePage/Transcriptions";
import Disclaimer from "./pages/admin/AdminDisclaimer";
import AllCasesPage from "./pages/instructor/InstructorAllCases";
import NotFound from "./pages/NotFound";
// import Transcriptions from "./pages/student/Transcriptions";


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

  const ProtectedRoute = ({ allowedGroups, userGroup, children }) => {
    if (!userGroup) return null; // Or a loading spinner
  
    const isAuthorized = userGroup.some((group) => allowedGroups.includes(group));
  
    return isAuthorized ? children : <Navigate to="/home" />;
  };

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
        return <InstructorHomepage />;
    } else if (userGroup && userGroup.includes("student")) {
      return <StudentHomepage />;
    } else {
      return <Login />;
    }
  };

  const getAllCases = () => {
    if (userGroup && userGroup.includes("instructor")) {
        return <AllCasesPage />;
    } else {
      return <ViewAllCases />;
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
          <Route path="/new-case" element={user ? <NewCaseForm /> : <Login />} />
          <Route path="/cases" element={user ? <ViewAllCases /> : <Login />} />
          <Route path="/all-cases" element={getAllCases()} />
          <Route path="/home/*" element={getHomePage()} />
          <Route path="/case/:caseId/interview-assistant" element={<InterviewAssistant />} />
          <Route path="/case/:caseId/overview/*" element={<CaseOverview />} />
          <Route path="/case/:caseId/summaries" element={<SummariesPage />} />
          <Route path="/case/:caseId/transcriptions" element={<Transcriptions />} />
          <Route path="/case/:caseId/feedback" element={<CaseFeedback />} />
          <Route path="/ai-control-panel" element={<ProtectedRoute allowedGroups={["admin", "techadmin"]} userGroup={userGroup}>
                                                  <AIControlPanel />
                                                </ProtectedRoute>} />  
          <Route path="/disclaimer" element={<ProtectedRoute allowedGroups={["admin", "techadmin"]} userGroup={userGroup}>
                                                  <Disclaimer />
                                                </ProtectedRoute>} />       

          {/* [KEEP ON BOTTOM] Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />                           
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
