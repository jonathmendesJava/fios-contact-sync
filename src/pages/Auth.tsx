import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signInWithOTP, verifyOTP, user } = useAuth();
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

    const { error } = await signInWithOTP(email);
    
    if (error) {
      toast({
        title: "Erro no envio",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStep("otp");
      toast({
        title: "Código enviado!",
        description: "Verifique seu email e digite o código recebido.",
      });
    }
    
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpToken.length !== 6) return;
    
    setLoading(true);

    const { error } = await verifyOTP(email, otpToken);
    
    if (error) {
      toast({
        title: "Código inválido",
        description: "Verifique o código e tente novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Redirecionando para o dashboard...",
      });
      // Navigation will happen automatically via useEffect
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Fios Tecnologia</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Digite seu email para receber o código de acesso"
              : "Digite o código de 6 dígitos enviado para seu email"
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
                {loading ? "Enviando..." : "Enviar Código"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Código de Verificação</Label>
                <div className="flex justify-center">
                  <InputOTP
                    value={otpToken}
                    onChange={setOtpToken}
                    maxLength={6}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Código enviado para: {email}
                </p>
              </div>
              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || otpToken.length !== 6}
                >
                  {loading ? "Verificando..." : "Entrar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    setOtpToken("");
                  }}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;