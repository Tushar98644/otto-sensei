export function Ps1({ host }: { host: string }) {
  return (
    <span className="ps1">
      <span className="user">visitor</span>
      <span className="gray">@</span>
      <span className="host">{host}</span>
      <span className="gray">:$ ~ </span>
    </span>
  );
}
