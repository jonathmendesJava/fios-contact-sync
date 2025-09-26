import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Container, Engine } from "tsparticles-engine";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInWithPassword, user } = useAuth();
  const { toast } = useToast();

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    // Particles loaded callback
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signInWithPassword(email, password);
    
    if (error) {
      toast({
        title: "Erro no login",
        description: "Email ou senha incorretos.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o painel...",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Lunar Background */}
      <div className="absolute inset-0 bg-gradient-radial from-slate-900 via-slate-950 to-black"></div>
      
      {/* Distant Star Field */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, white, transparent),
            radial-gradient(1px 1px at 40px 70px, white, transparent),
            radial-gradient(0.5px 0.5px at 90px 40px, white, transparent),
            radial-gradient(0.5px 0.5px at 130px 80px, white, transparent),
            radial-gradient(1px 1px at 160px 30px, white, transparent),
            radial-gradient(0.5px 0.5px at 200px 60px, white, transparent),
            radial-gradient(1px 1px at 240px 90px, white, transparent),
            radial-gradient(0.5px 0.5px at 280px 20px, white, transparent),
            radial-gradient(1px 1px at 320px 70px, white, transparent),
            radial-gradient(0.5px 0.5px at 360px 40px, white, transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 200px',
          opacity: 0.3
        }} />
      </div>

      
      {/* Subtle Moon */}
      <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-radial from-slate-400/20 to-transparent blur-sm"></div>
      
      {/* Advanced Space Animation with Particles */}
      <Particles
        id="auth-particles"
        init={particlesInit}
        loaded={particlesLoaded}
        className="absolute inset-0 z-0"
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 60,
          interactivity: {
            events: {
              onClick: {
                enable: true,
                mode: "push",
              },
              onHover: {
                enable: true,
                mode: ["grab", "connect", "attract"],
              },
              resize: true,
            },
            modes: {
              connect: {
                distance: 200,
                links: {
                  opacity: 0.8,
                  color: "#64ffda",
                  width: 1.5,
                },
                radius: 120,
              },
              grab: {
                distance: 220,
                links: {
                  opacity: 0.7,
                  color: "#64ffda",
                  width: 2,
                  triangles: {
                    enable: true,
                    opacity: 0.3,
                    color: "#64ffda",
                  },
                },
              },
              attract: {
                distance: 150,
                duration: 0.4,
                easing: "ease-out-quad",
                factor: 3,
                maxSpeed: 50,
                speed: 1,
              },
              bubble: {
                distance: 180,
                size: 8,
                duration: 2,
                opacity: 0.8,
              },
              push: {
                quantity: 6,
              },
            },
          },
            particles: {
              color: {
                value: "#64ffda",
              },
              links: {
                color: "#64ffda",
                distance: 150,
                enable: false,
                opacity: 0.2,
                width: 1,
                triangles: {
                  enable: true,
                  opacity: 0.15,
                  color: "#64ffda",
                },
                warp: true,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "out",
                },
                random: true,
                speed: 0.3,
                straight: false,
                attract: {
                  enable: true,
                  rotateX: 200,
                  rotateY: 400,
                },
                center: {
                  x: 50,
                  y: 50,
                  mode: "percent",
                  radius: 300,
                },
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 140,
              },
              opacity: {
                value: { min: 0.4, max: 0.9 },
                animation: {
                  enable: true,
                  speed: 1.2,
                  sync: false,
                },
              },
            shape: {
              type: ["circle"],
              options: {
                star: {
                  sides: 5
                },
                polygon: {
                  sides: 6
                }
              }
            },
            size: {
              value: { min: 1, max: 4 },
              animation: {
                enable: true,
                speed: 2,
                sync: false,
              },
            },
            twinkle: {
              particles: {
                enable: true,
                frequency: 0.02,
                opacity: 1,
              },
            },
          },
          detectRetina: true,
          reduceDuplicates: true,
        }}
      />
      
      {/* Enhanced Black Holes */}
      <div className="absolute top-1/4 left-1/4 w-20 h-20 rounded-full bg-gradient-radial from-transparent via-purple-900/30 to-black/80 animate-black-hole shadow-2xl shadow-purple-500/20"></div>
      <div className="absolute bottom-1/3 right-1/5 w-16 h-16 rounded-full bg-gradient-radial from-transparent via-blue-900/20 to-black/60 animate-black-hole shadow-2xl shadow-blue-500/20"></div>
      <div className="absolute top-3/4 right-1/3 w-12 h-12 rounded-full bg-gradient-radial from-transparent via-indigo-900/25 to-black/70 animate-black-hole shadow-2xl shadow-indigo-500/20"></div>
      
      {/* Distant Galaxies */}
      <div className="absolute top-16 right-1/3 w-24 h-2 bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 blur-sm"></div>
      <div className="absolute bottom-32 left-1/4 w-20 h-1 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent -rotate-12 blur-sm"></div>
      
      <Card className="w-full max-w-md relative z-10 bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Fios Tecnologia</CardTitle>
          <CardDescription>
            Digite suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;