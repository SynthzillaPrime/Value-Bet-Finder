import React, { useState } from "react";
import { Lock, ArrowRight, KeyRound } from "lucide-react";

interface Props {
  mode: "setup" | "login";
  onSuccess: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  onSetup: (pin: string) => Promise<boolean>;
}

export const PinLock: React.FC<Props> = ({
  mode,
  onSuccess,
  onVerify,
  onSetup,
}) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "login") {
      const valid = await onVerify(pin);
      if (valid) {
        onSuccess();
      } else {
        setError("Wrong PIN. Try again.");
        setPin("");
      }
    } else if (mode === "setup") {
      if (step === "enter") {
        if (pin.length < 4 || pin.length > 6) {
          setError("PIN must be 4-6 digits.");
          setLoading(false);
          return;
        }
        setStep("confirm");
        setLoading(false);
        return;
      } else {
        if (pin !== confirmPin) {
          setError("PINs don't match. Start over.");
          setPin("");
          setConfirmPin("");
          setStep("enter");
          setLoading(false);
          return;
        }
        const success = await onSetup(pin);
        if (success) {
          onSuccess();
        } else {
          setError("Failed to set PIN. Try again.");
        }
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 px-4">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-sm w-full">
        <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          {mode === "setup" ? (
            <KeyRound className="w-8 h-8 text-blue-400" />
          ) : (
            <Lock className="w-8 h-8 text-blue-400" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {mode === "setup"
            ? step === "enter"
              ? "Set Your PIN"
              : "Confirm PIN"
            : "Enter PIN"}
        </h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          {mode === "setup"
            ? step === "enter"
              ? "Choose a 4-6 digit PIN to secure your data."
              : "Enter the same PIN again to confirm."
            : "Enter your PIN to access Value Bet Finder."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === "enter" ? (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPin(val);
                setError("");
              }}
              placeholder="••••"
              className="w-full bg-slate-800 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
              autoFocus
            />
          ) : (
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setConfirmPin(val);
                setError("");
              }}
              placeholder="••••"
              className="w-full bg-slate-800 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] px-4 py-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
              autoFocus
            />
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (step === "enter" && pin.length < 4) ||
              (step === "confirm" && confirmPin.length < 4)
            }
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              "Checking..."
            ) : (
              <>
                {mode === "setup" && step === "enter"
                  ? "Next"
                  : mode === "setup"
                    ? "Set PIN"
                    : "Unlock"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
