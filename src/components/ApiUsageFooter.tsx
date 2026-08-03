import React from "react";

interface ApiUsageFooterProps {
  requestsUsed: number | null;
  requestsRemaining: number | null;
}

export const ApiUsageFooter: React.FC<ApiUsageFooterProps> = ({
  requestsUsed,
  requestsRemaining,
}) => {
  return (
    <footer className="mt-12 pb-8 flex justify-center">
      <div className="flex flex-col gap-1.5 bg-slate-900 px-6 py-3 rounded-full border border-slate-800 w-64 shadow-lg">
        <div className="flex justify-center items-center text-xs text-slate-400">
          <span className="text-slate-300 font-medium">
            {requestsUsed !== null && requestsRemaining !== null ? (
              <>
                API: {requestsUsed.toLocaleString()} /{" "}
                {(requestsUsed + requestsRemaining).toLocaleString()} used
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              requestsUsed === null || requestsRemaining === null
                ? "w-0"
                : (requestsUsed / (requestsUsed + requestsRemaining)) * 100 >= 90
                ? "bg-red-500"
                : (requestsUsed / (requestsUsed + requestsRemaining)) * 100 >= 70
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{
              width: `${
                requestsUsed === null || requestsRemaining === null
                  ? 0
                  : Math.min(
                      100,
                      Math.max(
                        0,
                        (requestsUsed / (requestsUsed + requestsRemaining)) * 100,
                      ),
                    )
              }%`,
            }}
          />
        </div>
        <div className="text-[10px] text-slate-600 text-center">
          Resets{" "}
          {new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            1,
          ).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>
      </div>
    </footer>
  );
};
