import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Image, Palette, Sparkles } from 'lucide-react';

/**
 * Visual Context Settings Page
 *
 * Configure how visual assets (brand images, style references) are used
 * in AI image generation for this project.
 */
function VisualContextSettingsPage() {
  const { projectId } = useParams({
    from: '/workspace/$id/project/$projectId/settings/visual-context',
  });
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['project-visual-settings', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('visual_context_settings')
        .eq('id', projectId)
        .single();
      return data?.visual_context_settings || {
        auto_apply_brand_assets: true,
        brand_consistency_strength: 0.7,
        style_reference_enabled: true,
        color_palette_extraction: true,
      };
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from('projects')
        .update({
          visual_context_settings: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-visual-settings', projectId] });
      toast.success('Visual context settings updated');
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    if (!settings) return;
    updateSettings.mutate({ ...settings, [key]: value });
  };

  const handleSliderChange = (key: string, value: number[]) => {
    if (!settings) return;
    updateSettings.mutate({ ...settings, [key]: value[0] });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Palette className="h-6 w-6 text-[#5B8DEF]" />
          Visual Context Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure how brand assets and style references are applied to AI-generated images
        </p>
      </div>

      {/* Brand Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-[#5B8DEF]" />
            Brand Assets
          </CardTitle>
          <CardDescription>
            Automatically apply your brand's visual identity to generated images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-brand">Auto-apply brand assets</Label>
              <p className="text-sm text-slate-500">
                Include categorized brand images as style references
              </p>
            </div>
            <Switch
              id="auto-brand"
              checked={settings?.auto_apply_brand_assets ?? true}
              onCheckedChange={(checked) =>
                handleToggle('auto_apply_brand_assets', checked)
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Brand consistency strength</Label>
              <span className="text-sm text-slate-500">
                {Math.round((settings?.brand_consistency_strength ?? 0.7) * 100)}%
              </span>
            </div>
            <Slider
              value={[settings?.brand_consistency_strength ?? 0.7]}
              onValueChange={(value) =>
                handleSliderChange('brand_consistency_strength', value)
              }
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-slate-500">
              How strongly brand visual elements influence the generated images
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Style References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#5B8DEF]" />
            Style References
          </CardTitle>
          <CardDescription>
            Use uploaded images as style and composition guides
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="style-ref">Enable style reference mode</Label>
              <p className="text-sm text-slate-500">
                Allow using project images for style transfer
              </p>
            </div>
            <Switch
              id="style-ref"
              checked={settings?.style_reference_enabled ?? true}
              onCheckedChange={(checked) =>
                handleToggle('style_reference_enabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="color-palette">Color palette extraction</Label>
              <p className="text-sm text-slate-500">
                Extract and apply color schemes from reference images
              </p>
            </div>
            <Switch
              id="color-palette"
              checked={settings?.color_palette_extraction ?? true}
              onCheckedChange={(checked) =>
                handleToggle('color_palette_extraction', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-[#5B8DEF]/20 bg-[#5B8DEF]/5">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong className="text-[#5B8DEF]">💡 Tip:</strong> Higher brand
            consistency ensures generated images align with your visual identity,
            but may limit creative exploration. Adjust based on your needs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute(
  '/workspace/$id/project/$projectId/settings/visual-context',
)({
  component: VisualContextSettingsPage,
});
