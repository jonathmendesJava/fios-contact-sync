import React from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';

export function TenantSelector() {
  const [open, setOpen] = React.useState(false);
  const { currentTenant, userTenants, switchTenant, loading } = useTenant();

  if (loading || !currentTenant) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentTenant.name}</span>
            <Badge variant={currentTenant.role === 'owner' ? 'default' : 'secondary'} className="ml-auto">
              {currentTenant.role === 'owner' ? 'Proprietário' : 
               currentTenant.role === 'admin' ? 'Admin' : 'Membro'}
            </Badge>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar organização..." />
          <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
          <CommandGroup>
            {userTenants.map((tenant) => (
              <CommandItem
                key={tenant.id}
                value={tenant.name}
                onSelect={() => {
                  switchTenant(tenant.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    tenant.id === currentTenant.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="truncate">{tenant.name}</span>
                  <Badge variant={tenant.role === 'owner' ? 'default' : 'secondary'}>
                    {tenant.role === 'owner' ? 'Proprietário' : 
                     tenant.role === 'admin' ? 'Admin' : 'Membro'}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}