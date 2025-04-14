import { formatDistanceToNowStrict } from 'date-fns';

function formatShortRelativeTime(date) {
  const formatted = formatDistanceToNowStrict(new Date(date));
  // formatted is typically something like "5 minutes", "2 days", "1 hour"
  const [value, unit] = formatted.split(' ');
  
  // Create a mapping for unit conversion:
  const unitMapping = {
    seconds: 's',
    second: 's',
    minutes: 'm',
    minute: 'm',
    hours: 'h',
    hour: 'h',
    days: 'd',
    day: 'd',
    months: 'mo',
    month: 'mo',
    years: 'y',
    year: 'y'
  };

  return `${value}${unitMapping[unit] || unit}`;
}

export default function Notification({ title, content, date, case_id, instructor_name }) {
  return (
    <div
      onClick={() => window.location.href = `/case/${case_id}/feedback`}
      className="flex items-start py-3 pr-3 hover:bg-[var(--background2)] transition-all duration-300 cursor-pointer"
    >

      {/* Notification Details */}
      <div className="ml-4 flex-grow truncate text-left text-[var(--text)]">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold  truncate">New Feedback From {instructor_name}</h4>
          
          
          <span className="text-sm text-gray-500">{formatShortRelativeTime(date)}</span>
          
          {/* <span className="text-sm text-gray-500">{date}</span> */}
        </div>
        <span className="text-xs text-gray-400">
            <strong>Case: <span className="font-medium text-gray-400">{title}</span></strong>
          </span>
        <p className="mt-1 text-sm truncate">
          {content}
        </p>
        {/* <div className="mt-2">
          <span className="text-xs text-gray-">
            From: <span className="font-medium text-gray-400">{instructor_name}</span>
          </span>
        </div> */}
      </div>
    </div>
  );
}
