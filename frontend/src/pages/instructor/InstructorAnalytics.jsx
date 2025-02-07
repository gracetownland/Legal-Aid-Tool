import React, { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  LinearProgress,
  Grid,
  Paper,
} from "@mui/material";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function titleCase(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const InstructorAnalytics = ({ groupName, simulation_group_id }) => {
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens.idToken;
        const response = await fetch(
          `${
            import.meta.env.VITE_API_ENDPOINT
          }instructor/analytics?simulation_group_id=${encodeURIComponent(simulation_group_id)}`,
          {
            method: "GET",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.ok) {
          const analytics_data = await response.json();
          console.log("Analytics data:", analytics_data);
          setData(analytics_data);
        } else {
          console.error("Failed to fetch analytics:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, [simulation_group_id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container sx={{ flexGrow: 1, p: 3, marginTop: 9, width: "100%", overflow: "auto" }}>
      <Typography
        color="black"
        fontStyle="semibold"
        textAlign="left"
        variant="h6"
        gutterBottom
      >
        {titleCase(groupName)}
      </Typography>

      {data.length === 0 ? (
        <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
          textAlign: "center",
        }}
      >
          <Typography variant="h5" color="textSecondary">
            No data to display. Please check back later.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Tabs for Patients */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="patient tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {data.map((patient, index) => (
              <Tab key={index} label={titleCase(patient.patient_name)} />
            ))}
          </Tabs>

          {data.map((patient, index) => (
            <Box
              key={index}
              hidden={tabValue !== index}
              sx={{ marginTop: 4, paddingTop: 2 }}
            >
              <Typography
                variant="h6"
                color="textPrimary"
                gutterBottom
                sx={{ marginBottom: 2 }}
              >
                {titleCase(patient.patient_name)} Overview
              </Typography>

              {/* Insights Section */}
              <Box mb={4}>
                <Paper>
                  <Grid
                    container
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ padding: 2 }}
                  >
                    {/* Instructor Completion Percentage */}
                    <Grid item xs={12} sm={6}>
                      <Typography>Instructor Completion Percentage:</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={patient.instructor_completion_percentage || 0}
                        sx={{ marginY: 1 }}
                      />
                      <Typography textAlign="right">
                        {patient.instructor_completion_percentage.toFixed(2)}%
                      </Typography>
                    </Grid>

                    {/* LLM Completion Percentage: (conditionally displayed) */}
                    {patient.llm_completion && (
                      <Grid item xs={12} sm={6}>
                        <Typography>LLM Completion Percentage:</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={patient.ai_score_percentage || 0}
                          sx={{ marginY: 1 }}
                        />
                        <Typography textAlign="right">
                          {patient.ai_score_percentage.toFixed(2)}%
                        </Typography>
                      </Grid>
                    )}
                    {/* Student and AI Message Counts with Access Count */}
                    {patient.llm_completion && (
                      <Grid item xs={12} sm={6}>
                        <Typography>
                          Student Message Count: {patient.student_message_count}
                        </Typography>
                        <Typography>
                          AI Message Count: {patient.ai_message_count}
                        </Typography>
                      </Grid>
                    )}

                    {patient.llm_completion && (
                      <Grid item xs={12} sm={6}>
                        <Typography>
                          Student Access Count: {patient.access_count}
                        </Typography>
                      </Grid>
                    )}

                    {!patient.llm_completion && (
                      <Grid item xs={12} sm={6}>
                        <Typography>
                          Student Message Count: {patient.student_message_count}
                        </Typography>
                        <Typography>
                          AI Message Count: {patient.ai_message_count}
                        </Typography>
                        <Typography>
                          Student Access Count: {patient.access_count}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Box>

              {/* Message Count Chart */}
              <Paper>
                <Box mb={4} sx={{ height: 400, paddingBottom: 4 }}>
                  <Typography
                    color="black"
                    textAlign="left"
                    paddingLeft={2}
                    padding={2}
                  >
                    Message Count
                  </Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Messages",
                          StudentMessages:
                            parseInt(patient.student_message_count, 10) || 0,
                          AIMessages: parseInt(patient.ai_message_count, 10) || 0,
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickMargin={10} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="StudentMessages"
                        fill="#8884d8"
                        name="Student Messages"
                      />
                      <Bar
                        dataKey="AIMessages"
                        fill="#82ca9d"
                        name="AI Messages"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              {/* Completion Chart */}
              <Paper>
                <Box mb={4} sx={{ height: 400, paddingBottom: 4 }}>
                  <Typography
                    color="black"
                    textAlign="left"
                    paddingLeft={2}
                    padding={2}
                  >
                    Completion Overview
                  </Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Completion",
                          InstructorCompletion:
                            parseFloat(
                              patient.instructor_completion_percentage
                            ) || 0,
                          LLMCompletion: patient.llm_completion
                            ? parseFloat(patient.ai_score_percentage) || 0
                            : null,
                        },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickMargin={10} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="InstructorCompletion"
                        fill="#FFA500" // Orange for Instructor Completion
                        name="Instructor Completion %"
                      />
                      {patient.llm_completion && (
                        <Bar
                          dataKey="LLMCompletion"
                          fill="#800080" // Purple for LLM Completion
                          name="LLM Completion %"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Box>
          ))}
        </>
      )}
    </Container>
  );
};

export default InstructorAnalytics;
