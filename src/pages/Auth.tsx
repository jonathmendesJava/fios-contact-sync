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
                mode: ["connect", "grab"],
              },
              resize: true,
            },
            modes: {
              connect: {
                distance: 150,
                links: {
                  opacity: 0.3,
                },
                radius: 60,
              },
              grab: {
                distance: 200,
                links: {
                  opacity: 0.4,
                  color: "#64ffda",
                },
              },
              push: {
                quantity: 4,
              },
            },
          },
          particles: {
            color: {
              value: ["#ffffff", "#64ffda", "#bb86fc", "#03dac6", "#cf6679"],
            },
            links: {
              color: "#64ffda",
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
              triangles: {
                enable: true,
                opacity: 0.1,
              },
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: true,
              speed: 0.8,
              straight: false,
              attract: {
                enable: true,
                rotateX: 600,
                rotateY: 1200,
              },
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 120,
            },
            opacity: {
              value: { min: 0.3, max: 0.8 },
              animation: {
                enable: true,
                speed: 1,
                sync: false,
              },
            },
            shape: {
              type: ["circle", "triangle"],
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
                frequency: 0.05,
                opacity: 1,
              },
            },
          },
          detectRetina: true,
          reduceDuplicates: true,
        }}
      />
      
      {/* Black Holes */}
      <div className="absolute top-1/4 left-1/4 w-20 h-20 rounded-full bg-gradient-radial from-transparent via-purple-900/30 to-black/80 animate-black-hole"></div>
      <div className="absolute bottom-1/3 right-1/5 w-16 h-16 rounded-full bg-gradient-radial from-transparent via-blue-900/20 to-black/60 animate-black-hole"></div>
      <div className="absolute top-3/4 right-1/3 w-12 h-12 rounded-full bg-gradient-radial from-transparent via-indigo-900/25 to-black/70 animate-black-hole"></div>
      
      {/* Distant Nebulae */}
      <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-gradient-radial from-purple-500/10 via-purple-600/5 to-transparent blur-xl animate-nebula"></div>
      <div className="absolute bottom-20 right-10 w-60 h-32 rounded-full bg-gradient-radial from-cyan-500/8 via-blue-500/4 to-transparent blur-2xl animate-nebula-slow"></div>
      <div className="absolute top-1/2 left-5 w-32 h-48 rounded-full bg-gradient-radial from-pink-500/6 via-purple-400/3 to-transparent blur-xl animate-nebula"></div>
      
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