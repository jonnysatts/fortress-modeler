import { useCallback, useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [resolve, setResolve] = useState<((confirmed: boolean) => void) | null>(null);
  const [dialogProps, setDialogProps] = useState<Partial<ConfirmDialogProps>>({});

  const confirm = useCallback((props: Partial<ConfirmDialogProps> = {}): Promise<boolean> => {
    setDialogProps(props);
    setOpen(true);
    return new Promise<boolean>((res) => {
      setResolve(() => res);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    if (resolve) resolve(true);
    setResolve(null);
  }, [resolve]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    if (resolve) resolve(false);
    setResolve(null);
  }, [resolve]);

  // This is a placeholder dialog. Replace with your UI framework's dialog if needed.
  const ConfirmDialog = () =>
    open ? (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 300 }}>
          <h3 style={{ marginBottom: 8 }}>{dialogProps.title || 'Are you sure?'}</h3>
          <p style={{ marginBottom: 16 }}>{dialogProps.description || 'Do you want to continue?'}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={handleCancel}>Cancel</button>
            <button onClick={handleConfirm} style={{ background: '#007bff', color: 'white' }}>Confirm</button>
          </div>
        </div>
      </div>
    ) : null;

  return { confirm, ConfirmDialog };
}
