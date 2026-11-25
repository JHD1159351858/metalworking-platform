export function TradeIcon({ trade, ...props }) {
  return <img {...props} src={`/assets/trade-${trade.id}.png`} alt="" />;
}
