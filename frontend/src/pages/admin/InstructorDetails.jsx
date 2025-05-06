import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Typography,
  Box,
  Toolbar,
  Paper,
  Button,
  FormControl,
  Grid,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Autocomplete,
  TextField,
  IconButton,
  Icon
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Clear from "@mui/icons-material/Clear";
import { Diversity1 } from "@mui/icons-material";


// Function to convert string to title case
function titleCase(str) {
  if (typeof str !== "string") return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const InstructorDetails = ({ instructorData, onBack }) => {
  const instructor = instructorData;
  const [students, setStudents] = useState([]);  // All students
  const [assignedStudents, setAssignedStudents] = useState([]); // Assigned students
  const [selectedStudent, setSelectedStudent] = useState(null);  // Track the selected student

  useEffect(() => {
    console.log("Instructor:", instructor)
    // Fetch all students
    const fetchStudents = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}admin/students`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        } else {
          console.error("Failed to fetch students:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

    fetchStudents();
    fetchAssignedStudents();  // Fetch the assigned students when the component loads
  }, [instructor.id]);

  if (!instructor) {
    return <Typography>No data found for this instructor.</Typography>;
  }

  // Fetch assigned students
  const fetchAssignedStudents = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/instructorStudents?instructor_id=${instructor.id}`,
        {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setAssignedStudents(data);
      } else {
        console.error("Failed to fetch assigned students:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching assigned students:", error);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student to assign.", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;

      const payload = {
        instructor_id: instructor.id,
        student_id: selectedStudent.user_id,
      };

      // Assign student to instructor
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/assign_instructor_to_student`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        toast.success("Student assigned to instructor!", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
        fetchAssignedStudents(); // Refresh assigned students list
      } else {
        console.error("Failed to assign student:", response.statusText);
        toast.error("Failed to assign student.", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error assigning student:", error);
      toast.error("An error occurred while assigning the student.", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  const handleLowerInstructor = async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
  
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/lower_instructor?user_id=${instructor.id}`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.ok) {
        toast.success("Instructor removed and downgraded to student.", {
          position: "top-center",
          autoClose: 1000,
          theme: "colored",
        });
        onBack(); // Redirect to list view
      } else {
        const error = await response.json();
        toast.error(`Failed: ${error.error}`, {
          position: "top-center",
          autoClose: 1000,
          theme: "colored",
        });
      }
    } catch (err) {
      console.error("Error lowering instructor:", err);
      toast.error("An error occurred while removing the instructor.", {
        position: "top-center",
        autoClose: 1000,
        theme: "colored",
      });
    }
  };

  const handleUnassignStudent = async (studentId) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens.idToken;
      

      console.log("Unassigning student:", studentId);
  
      // Unassign student from instructor
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}admin/delete_instructor_student_assignment?instructor_id=${instructor.id}&student_id=${studentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          }
        }
      );
  
      if (response.ok) {
        fetchAssignedStudents(); // Refresh assigned students list
      } else {
        console.error("Failed to unassign student:", response.statusText);
        toast.error("Failed to unassign student.", {
          position: "top-center",
          autoClose: 1000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Error unassigning student:", error);
      toast.error("An error occurred while unassigning the student.", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  }
  

  return (
    <>
      <Box component="main" sx={{ flexGrow: 1, paddingTop: 1, textAlign: "left" }}>
        
        <Paper
          sx={{
            p: 2,
            marginBottom: 4,
            textAlign: "left",
            backgroundColor: "var(--background)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            boxShadow: "none",
          }}
        >
          <Typography variant="h5" sx={{ p: 1 }}>
            <strong>Instructor: </strong> {titleCase(instructor?.user)} {titleCase(instructor?.last)}
          </Typography>
          <Divider sx={{ p: 1, marginBottom: 3, borderColor: "var(--border)" }} />
          <Typography variant="h7" sx={{ marginBottom: 1, p: 1 }}>
            Email: {instructor.email}
          </Typography>
  
          {/* Assigned Students Section */}
          <Typography variant="h6" sx={{ marginTop: 2, marginBottom: 1 }}>
            Assigned Students:
          </Typography>
          <Box>
          <Divider sx={{ borderColor: "var(--border)", marginTop: 0.75, marginBottom: 1 }} />
            {assignedStudents.length > 0 ? (
              assignedStudents.map((student) => (
                <>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 10, borderRadius: 5, backgroundColor: "var(--background)", color: "var(--text)"}}>
                <Typography key={student.user_id}>
                  {student.first_name} {student.last_name}
                </Typography>
                <IconButton disableRipple disableFocusRipple  sx={{
                  '&:focus': { outline: 'none' },
                  '&:focus-visible': { outline: 'none' },
                }}>
                  <Clear sx={{color: '#808080'}} onClick={() => handleUnassignStudent(student.user_id)}/>
                </IconButton>

                
                </div>
                <Divider sx={{ borderColor: "var(--border)", marginTop: 0.75, marginBottom: 0.75 }} />
                </>
              ))
            ) : (
              <Typography sx={{marginTop: 2, color: "var(--placeholder-text)"}}>No students assigned yet.</Typography>
            )}
          </Box>
  
          <FormControl sx={{ width: "100%", marginBottom: 2, marginTop: 5 }}>
            <Autocomplete
              value={selectedStudent}
              onChange={(event, newValue) => setSelectedStudent(newValue)}
              options={students}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Student"
                  variant="outlined"
                  sx={{
                    "& .MuiInputBase-input": {
                      color: "var(--text)",
                      backgroundColor: "var(--background)",
                    },
                    "& .MuiInputLabel-root": {
                      color: "var(--placeholder-text)",
                    },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "var(--border)",
                      },
                      "&:hover fieldset": {
                        borderColor: "var(--border)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--border)",
                      },
                    },
                  }}
                />
              )}
            />
          </FormControl>
        </Paper>
  
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Button variant="contained" onClick={onBack} sx={{ width: "30%", mx: "left", backgroundColor: 'var(--primary)', color: 'white', boxShadow:'none',borderRadius: 2  }}>
              Back
            </Button>
            <Button
    variant="outlined"
    color="error"
    onClick={handleLowerInstructor}
    sx={{
      width: "50%",
      ml: 2,
      borderRadius: 2,
      borderColor: "#e57373",
      color: "#e57373",
    }}
  >
    Remove Instructor
  </Button>
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <Button
            type="button"
              variant="contained"
              color="primary"
              onClick={handleAssignStudent}
              sx={{ width: "40%", mx: "right", backgroundColor: 'var(--primary)', color: 'white', boxShadow:'none',borderRadius: 2 }}
            >
              Assign Student
            </Button>
          </Grid>
        </Grid>
      </Box>
  
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  )};

export default InstructorDetails;
