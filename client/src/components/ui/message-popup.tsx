import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type MessageType = "success" | "error" | "warning" | "info";

interface MessagePopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: MessageType;
}

const iconMap = {
  success: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
  error: <XCircle className="h-12 w-12 text-red-500" />,
  warning: <AlertTriangle className="h-12 w-12 text-amber-500" />,
  info: <Info className="h-12 w-12 text-blue-500" />,
};

export function MessagePopup({
  open,
  onClose,
  title,
  description,
  type = "success",
}: MessagePopupProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="mb-4">{iconMap[type]}</div>
          <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-center mt-2">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="justify-center sm:justify-center">
          <AlertDialogAction onClick={onClose} data-testid="button-popup-ok">
            Aceptar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState, useCallback } from "react";

interface MessageState {
  open: boolean;
  title: string;
  description?: string;
  type: MessageType;
}

export function useMessagePopup() {
  const [message, setMessage] = useState<MessageState>({
    open: false,
    title: "",
    description: "",
    type: "success",
  });

  const showMessage = useCallback(
    (title: string, description?: string, type: MessageType = "success") => {
      setMessage({ open: true, title, description, type });
    },
    []
  );

  const showSuccess = useCallback((title: string, description?: string) => {
    setMessage({ open: true, title, description, type: "success" });
  }, []);

  const showError = useCallback((title: string, description?: string) => {
    setMessage({ open: true, title, description, type: "error" });
  }, []);

  const showWarning = useCallback((title: string, description?: string) => {
    setMessage({ open: true, title, description, type: "warning" });
  }, []);

  const showInfo = useCallback((title: string, description?: string) => {
    setMessage({ open: true, title, description, type: "info" });
  }, []);

  const closeMessage = useCallback(() => {
    setMessage((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    message,
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeMessage,
  };
}
