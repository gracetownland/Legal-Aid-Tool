import {Box, Typography} from '@mui/material'
import SideMenu from './sidemenu';


const PrelimSummary = () => (
    <Box display="flex">
      <SideMenu />
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
            Preliminary Summary
      </Typography>
      {/* Your Case Overview Content here */}
    </Box>
  );

  
export default PrelimSummary