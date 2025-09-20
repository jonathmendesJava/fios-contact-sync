import React from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <div style={{ textAlign: "center", maxWidth: "800px", color: "#2DF1A0" }}>
        <h1 style={{ 
          fontSize: "3rem", 
          marginBottom: "2rem",
          background: "linear-gradient(45deg, #2DF1A0, #33F09E)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Fios Tecnologia
        </h1>
        
        <p style={{ 
          fontSize: "1.25rem", 
          marginBottom: "3rem", 
          color: "#888",
          lineHeight: "1.6"
        }}>
          Sistema completo para gerenciamento de contatos e grupos. 
          Importe via CSV, organize por grupos e mantenha seus contatos sempre atualizados.
        </p>
        
        <button
          onClick={() => navigate("/auth")}
          style={{
            background: "#2DF1A0",
            color: "#000",
            border: "none",
            padding: "1rem 2rem",
            fontSize: "1.125rem",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "3rem"
          }}
        >
          Acessar Sistema →
        </button>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "2rem",
          marginTop: "3rem"
        }}>
          <div style={{ 
            padding: "1.5rem", 
            background: "#0a0a0a", 
            border: "1px solid #333",
            borderRadius: "8px"
          }}>
            <h3 style={{ marginBottom: "1rem" }}>Grupos Organizados</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              Organize seus contatos em grupos personalizados
            </p>
          </div>
          <div style={{ 
            padding: "1.5rem", 
            background: "#0a0a0a", 
            border: "1px solid #333",
            borderRadius: "8px"
          }}>
            <h3 style={{ marginBottom: "1rem" }}>Importação CSV</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              Importe milhares de contatos em segundos
            </p>
          </div>
          <div style={{ 
            padding: "1.5rem", 
            background: "#0a0a0a", 
            border: "1px solid #333",
            borderRadius: "8px"
          }}>
            <h3 style={{ marginBottom: "1rem" }}>Anti-Duplicação</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              Sistema inteligente previne contatos duplicados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
