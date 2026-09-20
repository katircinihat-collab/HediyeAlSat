function RaffleMatchList({ matches }) {
  return <div className="admin-raffle-matches">
    {matches.map((match, index) => <div className="admin-raffle-match" key={`${match.giverDisplayName}-${index}`}>
      <strong>{match.giverDisplayName}</strong>
      <span aria-hidden="true">→</span>
      <strong>{match.recipientDisplayName}</strong>
    </div>)}
  </div>;
}

export default RaffleMatchList;
