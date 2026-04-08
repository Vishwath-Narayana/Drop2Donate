import { formatDate } from '../../utils/helpers';

/**
 * Vertical status timeline.
 *
 * steps: [{ key, label, icon }]
 * currentStatus: string
 * timestamps: { [key]: Date }
 */
export default function StatusTimeline({ steps, currentStatus, timestamps = {} }) {
  const currentIdx = steps.findIndex((s) => s.key === currentStatus);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />

      <div className="space-y-5">
        {steps.map((step, i) => {
          const done    = i <= currentIdx;
          const current = i === currentIdx;
          const ts      = timestamps?.[step.key];

          return (
            <div key={step.key} className="flex items-start gap-4 relative">
              {/* Circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all duration-300
                ${done
                  ? 'bg-green-500 border-green-500 text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-400'}
                ${current ? 'ring-4 ring-green-100 scale-110' : ''}
              `}>
                {done && !current
                  ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  : <span className="text-base leading-none">{step.icon}</span>
                }
              </div>

              {/* Label */}
              <div className="pt-1.5 flex-1">
                <p className={`text-sm font-semibold leading-none ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {ts && (
                  <p className="text-xs text-gray-400 mt-1">{formatDate(ts, 'MMM d, h:mm a')}</p>
                )}
                {current && !ts && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    In progress
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
