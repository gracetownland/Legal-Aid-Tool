import React from "react";
import PropTypes from "prop-types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Avatar } from "@mui/material";

const AIMessage = ({ message, profilePicture, name = "AI" }) => {
  const renderCodeBlock = (code, language) => {
    return (
      <SyntaxHighlighter
        language={language.toLowerCase()}
        style={dracula}
        customStyle={{
          fontSize: "0.85em",
        }}
      >
        {code}
      </SyntaxHighlighter>
    );
  };

  return (
    <div className="ml-16 mb-6 mr-16">
      <div className="flex flex-row flex-start">
        <Avatar
          src={profilePicture || ""}
          // alt="Profile Picture"
          sx={{
            width: 40,
            height: 40,
            backgroundColor: "#e0e0e0",
            color: "#757575",
            fontSize: "0.8rem",
          }}
        >
          {!profilePicture && name.charAt(0).toUpperCase()} 
        </Avatar>
        <div
          className="text-start ml-4 text-black"
          style={{ maxWidth: "61vw", width: "61vw", wordWrap: "break-word" }}
        >
          {message.split("```").map((part, index) => {
            if (index % 2 === 1) {
              const [language, ...codeLines] = part.split("\n");
              const code = codeLines.join("\n");
              return renderCodeBlock(code, language.trim());
            }
            return part;
          })}
        </div>
      </div>
    </div>
  );
};

AIMessage.propTypes = {
  message: PropTypes.string.isRequired,
  profilePicture: PropTypes.string,
  name: PropTypes.string, 
};

export default AIMessage;