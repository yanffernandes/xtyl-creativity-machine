import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Image, Download, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Shared Document Route
 *
 * Public view of a shared document (no authentication required).
 * Displays document content based on share token.
 */
function SharedDocumentPage() {
  const { token } = useParams({ from: '/shared/$token/' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-document', token],
    queryFn: async () => {
      // First, verify the share token and get document ID
      const { data: shareData, error: shareError } = await supabase
        .from('document_shares')
        .select('document_id, expires_at, view_count, max_views')
        .eq('share_token', token)
        .single();

      if (shareError || !shareData) {
        throw new Error('Invalid or expired share link');
      }

      // Check if expired
      if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
        throw new Error('This share link has expired');
      }

      // Check view limit
      if (
        shareData.max_views &&
        shareData.view_count >= shareData.max_views
      ) {
        throw new Error('This share link has reached its view limit');
      }

      // Get document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', shareData.document_id)
        .single();

      if (docError || !document) {
        throw new Error('Document not found');
      }

      // Increment view count (ignore errors)
      supabase
        .from('document_shares')
        .update({ view_count: (shareData.view_count || 0) + 1 })
        .eq('share_token', token)
        .then(() => {});

      return document;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <p className="text-slate-500">Loading shared document...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-sm text-slate-500">
              {(error as Error)?.message ||
                'This document is not available or the link has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isImage = data.document_type === 'image';
  const isText = data.document_type === 'text';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {isImage ? (
                  <Image className="h-6 w-6 text-[#5B8DEF] mt-1" />
                ) : (
                  <FileText className="h-6 w-6 text-[#5B8DEF] mt-1" />
                )}
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {data.title || 'Untitled Document'}
                  </h1>
                  {data.created_at && (
                    <p className="text-sm text-slate-500 mt-1">
                      Created {new Date(data.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {data.file_url && (
                <a
                  href={data.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            {isImage && data.file_url ? (
              <div className="space-y-4">
                <img
                  src={data.file_url}
                  alt={data.title || 'Shared image'}
                  className="w-full rounded-lg shadow-lg"
                />
                {data.content && (
                  <div className="pt-4 border-t prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {data.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ) : isText && data.content ? (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-12">
                No content available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Shared securely • Powered by XTYL Creativity Machine
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/shared/$token/')({
  component: SharedDocumentPage,
});
