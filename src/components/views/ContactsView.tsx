import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhoneNumber, isValidBrazilianPhone, getPhoneValidationError } from '@/lib/phone-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { ContactListItem } from '@/components/ui/contact-list-item';
import { 
  Trash2, 
  Edit2, 
  Contact, 
  Search, 
  Filter,
  AlertTriangle,
  Users,
  Phone,
  Mail
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

interface Group {
  id: string;
  name: string;
  contacts: Contact[];
}

export const ContactsView: React.FC = () => {
  const [groupedContacts, setGroupedContacts] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    signature: '',
    group_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all contacts with group info
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_groups (name)
        `)
        .order('name');

      if (contactsError) throw contactsError;

      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Detect duplicates
      const contacts = contactsData || [];
      const contactsWithDuplicates = detectDuplicates(contacts as Contact[]);

      // Group contacts by group
      const grouped = (groupsData || []).map(group => ({
        ...group,
        contacts: contactsWithDuplicates.filter(contact => contact.group_id === group.id)
      }));

      setGroupedContacts(grouped);
      setAllGroups(groupsData || []);
      
      // Auto-expand groups with contacts
      const groupsWithContacts = new Set(
        grouped.filter(g => g.contacts.length > 0).map(g => g.id)
      );
      setExpandedGroups(groupsWithContacts);
      
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const detectDuplicates = (contacts: Contact[]) => {
    const phoneMap = new Map<string, Contact[]>();
    const emailMap = new Map<string, Contact[]>();

    // Group by phone and email using normalization
    contacts.forEach(contact => {
      if (contact.phone) {
        const normalizedPhone = normalizePhoneNumber(contact.phone);
        if (normalizedPhone) {
          if (!phoneMap.has(normalizedPhone)) phoneMap.set(normalizedPhone, []);
          phoneMap.get(normalizedPhone)!.push(contact);
        }
      }
      
      if (contact.email) {
        const email = contact.email.toLowerCase();
        if (!emailMap.has(email)) emailMap.set(email, []);
        emailMap.get(email)!.push(contact);
      }
    });

    // Mark duplicates
    return contacts.map(contact => {
      const normalizedPhone = contact.phone ? normalizePhoneNumber(contact.phone) : null;
      const email = contact.email?.toLowerCase();
      
      const phoneGroup = normalizedPhone ? phoneMap.get(normalizedPhone) : [];
      const emailGroup = email ? emailMap.get(email) : [];
      
      const isPhoneDuplicate = phoneGroup && phoneGroup.length > 1;
      const isEmailDuplicate = emailGroup && emailGroup.length > 1;
      
      return {
        ...contact,
        isDuplicate: isPhoneDuplicate || isEmailDuplicate,
        duplicateType: isPhoneDuplicate ? 'phone' as const : (isEmailDuplicate ? 'email' as const : undefined)
      };
    });
  };

  const getFilteredGroups = () => {
    let filtered = groupedContacts;

    // Filter by group
    if (selectedGroupFilter !== 'all') {
      filtered = filtered.filter(group => group.id === selectedGroupFilter);
    }

    // Apply search and duplicate filters to contacts within groups
    return filtered.map(group => ({
      ...group,
      contacts: group.contacts.filter(contact => {
        // Search filter
        const matchesSearch = !searchTerm || 
          contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contact.phone.includes(searchTerm) ||
          (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));

        // Duplicate filter
        const matchesDuplicateFilter = !showOnlyDuplicates || contact.isDuplicate;

        return matchesSearch && matchesDuplicateFilter;
      })
    })).filter(group => group.contacts.length > 0 || selectedGroupFilter === group.id);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      signature: contact.signature || '',
      group_id: contact.group_id,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.group_id || !editingContact) return;

    // Validate phone number
    const phoneError = getPhoneValidationError(formData.phone.trim());
    if (phoneError) {
      toast({
        title: 'Erro de Validação',
        description: phoneError,
        variant: 'destructive',
      });
      return;
    }

    try {
      const contactData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        signature: formData.signature.trim() || null,
        group_id: formData.group_id,
      };

      const { error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato atualizado com sucesso!',
      });

      setIsDialogOpen(false);
      setEditingContact(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato excluído com sucesso!',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredGroups = getFilteredGroups();
  const totalContacts = groupedContacts.reduce((sum, group) => sum + group.contacts.length, 0);
  const totalDuplicates = groupedContacts.reduce((sum, group) => 
    sum + group.contacts.filter(c => c.isDuplicate).length, 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Contatos</h2>
        <p className="text-muted-foreground">Visualize e gerencie contatos organizados por grupo</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Contact className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total de Contatos</span>
            </div>
            <div className="text-2xl font-bold">{totalContacts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Grupos</span>
            </div>
            <div className="text-2xl font-bold">{allGroups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Duplicados</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{totalDuplicates}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {allGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showOnlyDuplicates ? "default" : "outline"}
          onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
          className="w-full sm:w-auto"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {showOnlyDuplicates ? 'Todos' : 'Só Duplicados'}
        </Button>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <Card key={group.id}>
            <Collapsible 
              open={expandedGroups.has(group.id)}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription>
                          {group.contacts.length} contatos
                          {group.contacts.filter(c => c.isDuplicate).length > 0 && (
                            <span className="ml-2">
                              • {group.contacts.filter(c => c.isDuplicate).length} duplicados
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      {expandedGroups.has(group.id) ? 'Ocultar' : 'Mostrar'}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {group.contacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Contact className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum contato neste grupo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.contacts.map((contact) => (
                        <ContactListItem
                          key={contact.id}
                          contact={contact}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {totalContacts === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Contact className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Nenhum contato encontrado</CardTitle>
            <CardDescription>
              Importe contatos via CSV ou crie grupos primeiro.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Altere as informações do contato
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Grupo *</Label>
                <Select 
                  value={formData.group_id} 
                  onValueChange={(value) => setFormData({...formData, group_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {allGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">Assinatura</Label>
                <Textarea
                  id="signature"
                  placeholder="Assinatura personalizada..."
                  value={formData.signature}
                  onChange={(e) => setFormData({...formData, signature: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};