import { createContext, useState, useContext } from "react";
import { v4 as uuidv4 } from "uuid"; // Generate unique IDs

const CaseContext = createContext();

export const CaseProvider = ({ children }) => {
  const [cases, setCases] = useState([]); // Store multiple cases

  const addCase = (newCase) => {
    const caseWithId = { id: uuidv4(), ...newCase };
    setCases((prevCases) => [...prevCases, caseWithId]);
    return caseWithId.id; // Return the new case ID for navigation
  };

  return (
    <CaseContext.Provider value={{ cases, addCase }}>
      {children}
    </CaseContext.Provider>
  );
};

export const useCase = () => useContext(CaseContext);
