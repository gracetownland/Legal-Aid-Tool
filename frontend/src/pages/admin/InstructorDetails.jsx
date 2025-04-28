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
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
        onBack();
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

  return (
    <>
      <Box component="main" sx={{ flexGrow: 1, p: 3, marginTop: 1, textAlign: "left" }}>
        <Toolbar />
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
          <Typography variant="h5" sx={{ marginBottom: 2, p: 1 }}>
            Instructor: {titleCase(instructor?.first_name)} {titleCase(instructor?.last_name)}
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
            {assignedStudents.length > 0 ? (
              assignedStudents.map((student) => (
                <Typography key={student.id}>
                  {student.first_name} {student.last_name}
                </Typography>
              ))
            ) : (
              <Typography>No students assigned yet.</Typography>
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
          </Grid>
          <Grid item xs={6} container justifyContent="flex-end">
            <Button
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
