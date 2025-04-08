export default function Notification({ title, content, date, case_id }) {
  return (
    <div className="flex flex-col bg-white shadow-lg w-64 p-2 rounded-lg" onClick={() => window.location.href = `/case/${case_id}/overview`} key={case_id}>
        <strong>{title}</strong>
       {content} 
       <it>{date}</it>
       case_id: {case_id}
        
      </div>
  );
}