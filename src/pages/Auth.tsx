import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInWithPassword, user } = useAuth();
  const { toast } = useToast();

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
      
      {/* Star Field */}
      <div className="absolute inset-0">
        {/* Large Stars */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`large-${i}`}
            className="absolute w-1 h-1 bg-white/80 rounded-full animate-star-drift"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${100 + Math.random() * 20}%`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${25 + Math.random() * 10}s`
            }}
          />
        ))}
        
        {/* Medium Stars */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`medium-${i}`}
            className="absolute w-0.5 h-0.5 bg-white/60 rounded-full animate-star-drift"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${100 + Math.random() * 20}%`,
              animationDelay: `${Math.random() * 25}s`,
              animationDuration: `${30 + Math.random() * 15}s`
            }}
          />
        ))}
        
        {/* Small Stars */}
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={`small-${i}`}
            className="absolute w-px h-px bg-white/40 rounded-full animate-star-drift"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${100 + Math.random() * 20}%`,
              animationDelay: `${Math.random() * 30}s`,
              animationDuration: `${35 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>
      
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