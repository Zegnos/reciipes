import React from "react";

export default function Http418() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#335c67",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          width: "90%",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          background: "white",
        }}
      >
        <img
          src="/418.jpg"
          alt="418"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            objectFit: "cover",
            borderRadius: 16,
          }}
        />
      </div>
    </div>
  );
}
