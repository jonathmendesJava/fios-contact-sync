import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-4xl">
        <h1 className="text-5xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Fios Tecnologia
        </h1>
        
        <p className="text-xl mb-12 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Sistema completo para gerenciamento de contatos e grupos. 
          Importe via CSV, organize por grupos e mantenha seus contatos sempre atualizados.
        </p>
        
        <Button 
          onClick={() => navigate("/auth")}
          size="lg"
          className="mb-12 text-lg px-8 py-6"
        >
          Acessar Sistema →
        </Button>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Grupos Organizados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize seus contatos em grupos personalizados
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Importação CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Importe milhares de contatos em segundos
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Anti-Duplicação</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Sistema inteligente previne contatos duplicados
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
