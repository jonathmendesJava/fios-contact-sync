import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  AlertTriangle 
} from 'lucide-react';

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

interface ContactListItemProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
}

export const ContactListItem: React.FC<ContactListItemProps> = ({
  contact,
  onEdit,
  onDelete,
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        {/* Avatar */}
        <Avatar className="h-10 w-10 bg-primary/10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>

        {/* Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="font-medium text-card-foreground truncate">
              {contact.name}
            </h4>
            {contact.isDuplicate && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                DUPLICADO
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-1 sm:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{contact.phone}</span>
              {contact.duplicateType === 'phone' && (
                <AlertTriangle className="h-3 w-3 text-destructive" />
              )}
            </div>
            
            {contact.email && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[200px]">{contact.email}</span>
                {contact.duplicateType === 'email' && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </div>
            )}
          </div>

          {contact.signature && (
            <p className="text-xs text-muted-foreground mt-1 italic truncate">
              "{contact.signature}"
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(contact)}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(contact.id)}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};