import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit2, Trash2, AlertTriangle, Phone, Mail } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  signature?: string;
  group_id: string;
  contact_groups: {
    name: string;
  };
  created_at: string;
  isDuplicate?: boolean;
  duplicateType?: 'phone' | 'email';
}

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts,
  onEdit,
  onDelete,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Phone className="h-8 w-8 mx-auto mb-2" />
        <p>Nenhum contato encontrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id} className="hover:bg-muted/50">
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  {contact.signature && (
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {contact.signature}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-sm">{contact.phone}</span>
                  {contact.isDuplicate && contact.duplicateType === 'phone' && (
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {contact.email ? (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[150px]">{contact.email}</span>
                    {contact.isDuplicate && contact.duplicateType === 'email' && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {contact.contact_groups.name}
                </Badge>
              </TableCell>
              <TableCell>
                {contact.isDuplicate ? (
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive" className="text-xs">
                      Duplicado
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-muted-foreground">OK</span>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(contact)}
                    className="h-8 w-8 p-0 hover:bg-accent"
                    title="Editar contato"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(contact.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir contato"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};