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
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInWithMagicLink, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      toast({
        title: "Erro no envio",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStep("sent");
      toast({
        title: "Link mágico enviado!",
        description: "Verifique seu email e clique no link para fazer login.",
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
            {step === "email" 
              ? "Digite seu email para receber o link de acesso"
              : "Link enviado! Verifique seu email para fazer login"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Link Mágico"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">Verifique seu email</h3>
                <p className="text-sm text-muted-foreground">
                  Enviamos um link mágico para <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique no link no seu email para fazer login automaticamente.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Usar outro email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;