// SET THIS TO false WHENEVER YOU WANT TO REMOVE/HIDE THE WARNING BANNER
export const SHOW_SCAM_WARNING = true;

export function ScamWarningBanner() {
  if (!SHOW_SCAM_WARNING) return null;

  return (
    <div className="bg-red-900/10 border-b border-red-200/80 px-4 sm:px-6 py-2.5 sm:py-3 text-red-950 text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto flex items-center gap-2.5">
        <span className="text-base shrink-0 select-none">⚠️</span>
        <p className="leading-normal font-medium">
          <strong className="font-semibold text-red-900">Beware of Scams:</strong> Historified is the sole original owner of <em>Sachitra Rishi Anuvad</em> by Pandey Ram Naresh Prasad. Please do not buy from anyone else, as several sellers are offering incorrect books under the same name.
        </p>
      </div>
    </div>
  );
}
