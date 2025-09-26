import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Container, Engine } from "tsparticles-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Users, Shield, Target } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    // Particles loaded callback
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card relative overflow-hidden">
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onClick: {
                enable: true,
                mode: "push",
              },
              onHover: {
                enable: true,
                mode: "connect",
              },
              resize: true,
            },
            modes: {
              push: {
                quantity: 4,
              },
              connect: {
                distance: 150,
                links: {
                  opacity: 0.3,
                },
                radius: 60,
              },
            },
          },
          particles: {
            color: {
              value: ["#40E0D0", "#4FFFEF", "#00CED1"],
            },
            links: {
              color: "#40E0D0",
              distance: 150,
              enable: false,
              opacity: 0.2,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: 0.5,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 80,
            },
            opacity: {
              value: { min: 0.3, max: 0.8 },
              animation: {
                enable: true,
                speed: 1,
                minimumValue: 0.1,
              },
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
              animation: {
                enable: true,
                speed: 2,
                minimumValue: 0.5,
              },
            },
          },
          detectRetina: true,
        }}
        className="absolute inset-0 z-0"
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-5xl">
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in">
              Fios Notify
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full opacity-60"></div>
          </div>
          
          <p className="text-2xl mb-12 text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Sistema Profissional de Envio em Massa para WhatsApp
          </p>
          
          <p className="text-lg mb-12 text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in">
            Gerencie campanhas, organize contatos e controle disparos com inteligência anti-bloqueio
          </p>
          
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
            className="mb-16 text-lg px-10 py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-primary/25 transition-all duration-300 animate-scale-in"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Iniciar Campanhas
          </Button>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-primary text-xl">Campanhas Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Crie e gerencie campanhas de disparo massivo com controle total
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4 mx-auto">
                  <Shield className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-secondary text-xl">Gestão de Status</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Sistema anti-bloqueio com controle de contatos ativos e inativos
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300 hover:scale-105 animate-fade-in">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 mx-auto">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-accent text-xl">Grupos de Disparo</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Organize contatos por segmentos para campanhas direcionadas
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
