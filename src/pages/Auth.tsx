import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Auth attempt:", email);
    // Temporary redirect for testing
    navigate("/dashboard");
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#000"
    }}>
      <div style={{ 
        background: "#0a0a0a", 
        padding: "2rem", 
        borderRadius: "8px",
        color: "#2DF1A0",
        maxWidth: "400px",
        width: "100%"
      }}>
        <h1 style={{ marginBottom: "1rem", textAlign: "center" }}>
          Fios Tecnologia
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "4px",
              border: "1px solid #333",
              background: "#111",
              color: "#fff"
            }}
            required
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "#2DF1A0",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;