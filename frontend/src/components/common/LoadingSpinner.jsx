export default function LoadingSpinner({ size = 'md', color = 'green', fullScreen = false }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };
  const colors = {
    green: 'border-green-600',
    orange: 'border-orange-500',
    blue: 'border-blue-500',
    gray: 'border-gray-400',
    white: 'border-white',
  };

  const spinner = (
    <div
      className={`${sizes[size]} border-4 border-gray-200 ${colors[color]} border-t-transparent rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return spinner;
}
