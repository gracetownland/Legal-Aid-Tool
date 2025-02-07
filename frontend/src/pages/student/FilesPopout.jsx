import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RefreshIcon from "@mui/icons-material/Refresh";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import { useState, useEffect } from "react";
import { hourglass } from "ldrs";

hourglass.register();

const IMAGE_FILE_TYPES = [
  "bmp", "gif", "jpeg", "jpg", "j2k", "jp2", "png", "ppm", "pgm", "pbm", 
  "sgi", "tga", "tiff", "tif", "webp", "xbm"
];

function FilesPopout({ open, onClose, files, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  
  const handleFileClick = (file) => {
    setSelectedFile(file);
    setScale(1); 
    setPosition({ x: 0, y: 0 }); 
    setRotation(0); 
  };

  const handleCloseFileViewer = () => {
    setSelectedFile(null);
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3)); 
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 1)); 
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0); 
  };

  const handleRotate = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360); 
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (moveEvent) => {
      setPosition({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const isImageFile = (fileType) => IMAGE_FILE_TYPES.includes(fileType);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Patient Information Files</DialogTitle>
      <DialogContent>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
            <l-hourglass size="40" bg-opacity="0.1" speed="1.75" color="black" />
          </div>
        ) : files.length === 0 ? (
          <Typography>No patient information files available.</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>File Name</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file, index) => (
                  <TableRow key={index} hover onClick={() => handleFileClick(file)} style={{ cursor: 'pointer' }}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{file.metadata || "No description available"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      {selectedFile && (
        <Dialog open={!!selectedFile} onClose={handleCloseFileViewer} fullWidth maxWidth="lg">
          <DialogTitle>{selectedFile.name}</DialogTitle>
          <DialogContent>
            {isImageFile(selectedFile.type) ? (
              <div
                style={{
                  overflow: "hidden",
                  cursor: "grab",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "600px",
                  position: "relative",
                }}
                onMouseDown={handleMouseDown}
              >
                <img
                  src={selectedFile.url}
                  alt={selectedFile.name}
                  style={{
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
                    transition: "transform 0.1s ease-out",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    cursor: "grab",
                  }}
                />
              </div>
            ) : (
              <iframe
                src={selectedFile.url}
                title={selectedFile.name}
                width="100%"
                height="600px"
                style={{ border: "none" }}
              />
            )}
          </DialogContent>
          <DialogActions>
            {isImageFile(selectedFile.type) && (
              <>
                <IconButton onClick={handleZoomIn} color="primary">
                  <ZoomInIcon />
                </IconButton>
                <IconButton onClick={handleZoomOut} color="primary">
                  <ZoomOutIcon />
                </IconButton>
                <IconButton onClick={handleRotate} color="primary">
                  <RotateRightIcon />
                </IconButton>
                <IconButton onClick={handleReset} color="primary">
                  <RefreshIcon />
                </IconButton>
              </>
            )}
            <Button onClick={handleCloseFileViewer} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}

export default FilesPopout;