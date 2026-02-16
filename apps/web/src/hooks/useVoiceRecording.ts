/**
 * Voice Recording Hook (Stub)
 *
 * TODO: Port full implementation from frontend/src/hooks/useVoiceRecording.ts
 * Currently returns defaults indicating voice recording is not supported.
 */

type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

export function useVoiceRecording(_onWarning?: () => void) {
  return {
    status: 'idle' as RecordingStatus,
    duration: 0,
    error: null as string | null,
    isSupported: false,
    startRecording: async () => {},
    stopRecording: async (): Promise<Blob | null> => null,
    cancelRecording: () => {},
    setStatus: (_status: RecordingStatus) => {},
    setError: (_error: string | null) => {},
  };
}
