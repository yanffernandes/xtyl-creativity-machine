import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Paperclip, FileText, Image, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { glassNodeClasses, handleDefaultClasses } from '@/lib/glass-utils';

function AttachNode({ data, selected }: NodeProps) {
  return (
    <div
      className={cn(
        'w-[280px] transition-all duration-200',
        glassNodeClasses,
        selected &&
          'ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(91,141,239,0.3)]',
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-xl">
        <div className="p-1.5 rounded-lg shrink-0 bg-white/[0.08] dark:bg-white/[0.04] text-indigo-500">
          <Paperclip className="w-4 h-4" />
        </div>
        <span className="font-medium text-sm text-foreground truncate">
          {data.label || 'Attach Creative'}
        </span>
      </div>
      <div className="p-3 space-y-3">
        <div className="text-xs text-muted-foreground">
          Combina um documento com um asset de imagem.
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <FileText className="w-3 h-3 text-emerald-400" />
            <span className="text-muted-foreground">
              Documento (Text Generation)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Image className="w-3 h-3 text-pink-400" />
            <span className="text-muted-foreground">
              Imagem (Image Generation)
            </span>
          </div>
        </div>
        <div className="flex items-start gap-1.5 pt-2 border-t border-white/10">
          <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-400/80">
            Conecte nos de geracao de texto e imagem
          </span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="document"
        className={cn(handleDefaultClasses, '!bg-emerald-400')}
        style={{ top: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className={cn(handleDefaultClasses, '!bg-pink-400')}
        style={{ top: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={handleDefaultClasses}
        style={{ top: '50%' }}
      />
    </div>
  );
}

export default memo(AttachNode);
