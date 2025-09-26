import React, { useState } from 'react';
import { ChevronDown, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { useTenant } from '@/hooks/useTenant';

export function TenantSelector() {
  const { currentTenant, userTenants, switchTenant, loading, getDisplayName } = useTenant();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!currentTenant || userTenants.length === 0) {
    return null;
  }

  const displayName = getDisplayName();

  // If user only has one tenant, show static name
  if (userTenants.length === 1) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        <span>{displayName}</span>
        {currentTenant?.role && (
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {currentTenant.role === 'owner' ? 'Proprietário' : 
             currentTenant.role === 'admin' ? 'Admin' : 'Membro'}
          </span>
        )}
      </div>
    );
  }

  // Multiple tenants - show selector
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{displayName}</span>
              {userTenants.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {userTenants.length} organizações disponíveis
                </span>
              )}
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar organização..." />
          <CommandEmpty>Nenhuma organização encontrada.</CommandEmpty>
          <CommandGroup>
            {userTenants.map((tenant) => (
              <CommandItem
                key={tenant.id}
                onSelect={() => {
                  switchTenant(tenant.id);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{tenant.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tenant.role === 'owner' ? 'Proprietário' : 
                     tenant.role === 'admin' ? 'Administrador' : 'Membro'}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}