import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Contact, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex justify-center mb-8">
          <Contact className="h-16 w-16 text-primary" />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Fios Tecnologia
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Sistema completo para gerenciamento de contatos e grupos. 
          Importe via CSV, organize por grupos e mantenha seus contatos sempre atualizados.
        </p>
        
        <div className="space-y-4">
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 py-6">
            Acessar Sistema
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Grupos Organizados</h3>
              <p className="text-sm text-muted-foreground">
                Organize seus contatos em grupos personalizados
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Importação CSV</h3>
              <p className="text-sm text-muted-foreground">
                Importe milhares de contatos em segundos
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">Anti-Duplicação</h3>
              <p className="text-sm text-muted-foreground">
                Sistema inteligente previne contatos duplicados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
