interface Metric {
  label: string;
  value: number;
  hint: string;
}

export function Metrics({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metrics">
      {metrics.map((m) => (
        <article key={m.label}>
          <small>{m.label}</small>
          <strong>{m.value}</strong>
          <p>{m.hint}</p>
        </article>
      ))}
    </section>
  );
}
