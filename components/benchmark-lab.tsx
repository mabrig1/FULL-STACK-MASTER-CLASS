import { benchmarkItems, benchmarkSummary } from "@/lib/benchmark";

export default function BenchmarkLab() {
  const summary = benchmarkSummary();

  return (
    <main className="commercialPage">
      <section className="commercialHero">
        <span className="eyebrow">INTERNAL BENCHMARK LAB</span>
        <h1>Measure capability coverage, not marketing adjectives.</h1>
        <p>
          This matrix tracks whether the platform implements the product patterns expected
          from advanced AI-native learning and coding systems.
        </p>
      </section>

      <section className="dataGrid benchmarkSummary">
        <article><strong>{summary.coverage}%</strong><span>feature-pattern coverage</span></article>
        <article><strong>{summary.implemented}</strong><span>implemented dimensions</span></article>
        <article><strong>{summary.partial}</strong><span>partial dimensions</span></article>
        <article><strong>{summary.planned}</strong><span>remaining benchmark gaps</span></article>
      </section>

      <section className="commercialSection">
        <div className="benchmarkMatrix">
          {benchmarkItems.map((item) => (
            <article key={item.id}>
              <div>
                <span className={"benchmarkStatus " + item.status}>{item.status}</span>
                <h3>{item.dimension}</h3>
                <p>{item.pattern}</p>
              </div>
              <code>{item.evidence}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="commercialSection">
        <span className="eyebrow">NEXT BENCHMARK GAP</span>
        <h2>Multimodal tutoring remains the clearest unimplemented frontier.</h2>
        <p className="muted">
          The current system is strong in adaptive learning, evidence, agents and code review.
          A future layer can add context-triggered diagrams, visual debugging aids and optional voice.
        </p>
      </section>
    </main>
  );
}
