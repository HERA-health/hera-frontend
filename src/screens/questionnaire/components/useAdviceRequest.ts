import { useRef, useState } from 'react';
import {
  sendAdvice,
  type AdviceRequest,
} from '../../../services/questionnaireService';
import { createSecureRandomUuid } from '../../../utils/secureRandom';
import { getErrorMessage } from '../../../constants/errors';

export function useAdviceRequest({
  draftId,
  specialistId,
  onSent,
}: {
  draftId?: string;
  specialistId?: string;
  onSent?: (result: AdviceRequest) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('choose');
  const [message, setMessage] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdviceRequest | null>(null);
  const command = useRef<string | null>(null);
  const sending = useRef(false);
  const send = async () => {
    if (sending.current || result || !message.trim()) return;
    sending.current = true;
    setBusy(true);
    setError('');
    command.current ??= createSecureRandomUuid();
    try {
      const saved = await sendAdvice(
        {
          submissionId: command.current,
          reason,
          message,
          shareQuestionnaire: share,
          specialistId,
        },
        draftId,
      );
      setResult(saved);
      setMessage('');
      await onSent?.(saved);
    } catch (e) {
      setError(
        getErrorMessage(
          e,
          'No se pudo enviar. Puedes reintentar sin duplicar la solicitud.',
        ),
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const reset = () => {
    if (sending.current) return;
    setReason('choose');
    setMessage('');
    setShare(false);
    setError('');
    setResult(null);
    command.current = null;
  };
  return {
    reason,
    setReason,
    message,
    setMessage,
    share,
    setShare,
    busy,
    error,
    result,
    send,
    reset,
  };
}
export type AdviceRequestController = ReturnType<typeof useAdviceRequest>;
