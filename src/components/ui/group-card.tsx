import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Edit2, 
  Trash2, 
  Eye, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react';
import { StatsChip } from './stats-chip';

interface Group {
  id: string;
  name: string;
  created_at: string;
  contacts_count?: number;
  duplicates_count?: number;
  last_updated?: string;
}

interface GroupCardProps {
  group: Group;
  onEdit: (group: Group) => void;
  onDelete: (groupId: string) => void;
  onViewContacts?: (groupId: string) => void;
  onAddContact: (groupId: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onEdit,
  onDelete,
  onViewContacts,
  onAddContact,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getGroupStatus = () => {
    if (!group.contacts_count || group.contacts_count === 0) {
      return { status: 'empty', label: 'Vazio', icon: XCircle, color: 'text-muted-foreground' };
    }
    if (group.duplicates_count && group.duplicates_count > 0) {
      return { status: 'warning', label: 'Com Duplicados', icon: AlertTriangle, color: 'text-destructive' };
    }
    return { status: 'healthy', label: 'Saudável', icon: CheckCircle2, color: 'text-primary' };
  };

  const status = getGroupStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-card-foreground truncate">
              {group.name}
            </CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <StatusIcon className={`h-4 w-4 ${status.color}`} />
              <span className={`text-sm ${status.color}`}>{status.label}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddContact(group.id)}
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
              title="Adicionar contato"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {onViewContacts && group.contacts_count && group.contacts_count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewContacts(group.id)}
                className="h-8 w-8 p-0 hover:bg-accent"
                title="Ver contatos"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(group)}
              className="h-8 w-8 p-0 hover:bg-accent"
              title="Editar grupo"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(group.id)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              title="Excluir grupo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatsChip
            icon={Users}
            label="Contatos"
            value={group.contacts_count || 0}
            color="primary"
          />
          {group.duplicates_count && group.duplicates_count > 0 && (
            <StatsChip
              icon={AlertTriangle}
              label="Duplicados"
              value={group.duplicates_count}
              color="destructive"
            />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Criado em {formatDate(group.created_at)}</span>
          </div>
          
          {group.last_updated && (
            <div className="flex items-center space-x-1">
              <span>Atualizado {formatDate(group.last_updated)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};