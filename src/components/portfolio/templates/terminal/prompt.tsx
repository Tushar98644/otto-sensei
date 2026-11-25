export function Ps1({ host, user }: { host: string; user: string }) {
  return (
    <span className="ps1">
      <span className="user">{user}</span>
      <span className="gray">@</span>
      <span className="host">{host}</span>
      <span className="gray">:$ ~ </span>
    </span>
  );
}
