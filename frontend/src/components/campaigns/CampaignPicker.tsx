'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Folder, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCampaigns, useCreateCampaign } from '@/hooks/useCampaigns'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface CampaignPickerProps {
  projectId: string
  value?: string | null
  onChange?: (campaignId: string | null) => void
  onCreateNew?: () => void
  placeholder?: string
  className?: string
}

export function CampaignPicker({
  projectId,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Selecionar campanha...',
  className,
}: CampaignPickerProps) {
  const [open, setOpen] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')

  const { data, isLoading } = useCampaigns(projectId)
  const createMutation = useCreateCampaign(projectId)

  const campaigns = data?.items || []
  const selectedCampaign = campaigns.find((c) => c.id === value)

  const handleSelect = (campaignId: string) => {
    onChange?.(campaignId === value ? null : campaignId)
    setOpen(false)
  }

  const handleCreateNew = async () => {
    if (!newCampaignName.trim()) {
      onCreateNew?.()
      setOpen(false)
      return
    }

    try {
      const campaign = await createMutation.mutateAsync({
        name: newCampaignName.trim(),
      })
      onChange?.(campaign.id)
      setNewCampaignName('')
      setOpen(false)
    } catch {
      // Error handled by mutation hook
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedCampaign?.name || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar campanha..."
            value={newCampaignName}
            onValueChange={setNewCampaignName}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhuma campanha encontrada
                </p>
                <Button
                  size="sm"
                  onClick={handleCreateNew}
                  disabled={createMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {newCampaignName
                    ? `Criar "${newCampaignName}"`
                    : 'Criar campanha'}
                </Button>
              </div>
            </CommandEmpty>
            {isLoading ? (
              <div className="p-2 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandGroup heading="Campanhas">
                  {campaigns.map((campaign) => (
                    <CommandItem
                      key={campaign.id}
                      value={campaign.name}
                      onSelect={() => handleSelect(campaign.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === campaign.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{campaign.name}</span>
                        {campaign.channel && (
                          <span className="text-xs text-muted-foreground">
                            {campaign.channel}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    {newCampaignName
                      ? `Criar "${newCampaignName}"`
                      : 'Nova campanha'}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
