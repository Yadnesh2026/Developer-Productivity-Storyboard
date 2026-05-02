const { useEffect, useMemo, useState } = React;
const h = React.createElement;

const metricConfig = [
  { key: "leadTimeDays", label: "Lead Time", unit: "days", better: "lower", decimals: 1 },
  { key: "cycleTimeDays", label: "Cycle Time", unit: "days", better: "lower", decimals: 1 },
  { key: "bugRate", label: "Bug Rate", unit: "%", better: "lower", decimals: 0, scale: 100 },
  { key: "deploymentFrequency", label: "Deployments", unit: "/mo", better: "higher", decimals: 0 },
  { key: "prThroughput", label: "PR Throughput", unit: "/mo", better: "higher", decimals: 0 }
];

function formatMetric(metric, value) {
  const scaled = metric.scale ? value * metric.scale : value;
  return `${scaled.toFixed(metric.decimals)} ${metric.unit}`;
}

function badgeClass(tone) {
  return `badge badge-${tone}`;
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("ic");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((response) => response.json())
      .then((data) => {
        setDashboard(data);
        setSelectedId(data.developers[0].id);
      })
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  const selectedDeveloper = useMemo(() => {
    if (!dashboard || !selectedId) {
      return null;
    }
    return dashboard.developers.find((developer) => developer.id === selectedId) || null;
  }, [dashboard, selectedId]);

  if (error) {
    return h("main", { className: "shell" }, h("div", { className: "empty-state" }, error));
  }

  if (!dashboard || !selectedDeveloper) {
    return h("main", { className: "shell" }, h("div", { className: "empty-state" }, "Loading MVP..."));
  }

  return h(
    "main",
    { className: "shell" },
    h(Header, { month: dashboard.month, view, setView }),
    h(
      "div",
      { className: "layout" },
      h(Sidebar, {
        developers: dashboard.developers,
        selectedId,
        onSelect: setSelectedId
      }),
      h(
        "section",
        { className: "content" },
        h(Hero, {
          developer: selectedDeveloper,
          month: dashboard.month
        }),
        h(MetricGrid, {
          developer: selectedDeveloper,
          org: dashboard.orgBenchmarks
        }),
        view === "ic"
          ? h(ICView, { developer: selectedDeveloper, dashboard })
          : h(ManagerView, { dashboard })
      )
    )
  );
}

function Header({ month, view, setView }) {
  return h(
    "header",
    { className: "topbar" },
    h(
      "div",
      null,
      h("h1", null, "Developer Productivity Storyboard"),
      h("p", { className: "subcopy" }, `Turning ${month} metrics into context, likely causes, and next actions.`)
    ),
    h(
      "div",
      { className: "segmented" },
      ["ic", "manager"].map((mode) =>
        h(
          "button",
          {
            key: mode,
            className: view === mode ? "segment active" : "segment",
            onClick: () => setView(mode)
          },
          mode === "ic" ? "IC View" : "Manager Snapshot"
        )
      )
    )
  );
}

function Sidebar({ developers, selectedId, onSelect }) {
  return h(
    "aside",
    { className: "sidebar" },
    h("h2", null, "Developers"),
    h(
      "div",
      { className: "developer-list" },
      developers.map((developer) =>
        h(
          "button",
          {
            key: developer.id,
            className: developer.id === selectedId ? "developer-card active" : "developer-card",
            onClick: () => onSelect(developer.id)
          },
          h("strong", null, developer.name),
          h("span", null, developer.role),
          h("span", { className: "muted" }, `${developer.team} - ${developer.focusArea}`)
        )
      )
    )
  );
}

function Hero({ developer, month }) {
  return h(
    "section",
    { className: "hero-panel" },
    h(
      "div",
      null,
      h("p", { className: "eyebrow" }, `${month} performance view`),
      h("h2", null, developer.name),
      h("p", { className: "subcopy" }, `${developer.role} on ${developer.team}, focused on ${developer.focusArea}.`)
    ),
    h(
      "div",
      { className: "signal-strip" },
      developer.signals.map((signal) => h("div", { key: signal, className: "signal-pill" }, signal))
    )
  );
}

function MetricGrid({ developer, org }) {
  return h(
    "section",
    { className: "metrics-grid" },
    metricConfig.map((metric) => {
      const value = developer.metrics[metric.key];
      const benchmark = org[metric.key];
      const good = metric.better === "lower" ? value <= benchmark : value >= benchmark;
      const delta = metric.better === "lower" ? benchmark - value : value - benchmark;

      return h(
        "article",
        { key: metric.key, className: "metric-card" },
        h("span", { className: "metric-label" }, metric.label),
        h("strong", { className: "metric-value" }, formatMetric(metric, value)),
        h(
          "span",
          { className: badgeClass(good ? "good" : "warn") },
          good ? "Healthier than team baseline" : "Needs attention"
        ),
        h(
          "p",
          { className: "metric-footnote" },
          `${Math.abs(metric.scale ? delta * metric.scale : delta).toFixed(metric.decimals)} ${metric.unit} vs org baseline`
        )
      );
    })
  );
}

function ICView({ developer, dashboard }) {
  return h(
    "section",
    { className: "detail-grid" },
    h(StoryCard, { developer }),
    h(ActionCard, { developer }),
    h(TrendCard, { developer }),
    h(DataCard, { developer, sourceSheets: dashboard.sourceSheets })
  );
}

function StoryCard({ developer }) {
  return h(
    "article",
    { className: "panel" },
    h("h3", null, "Likely Story"),
    h("p", { className: "story-copy" }, developer.interpretation.summary),
    h(
      "div",
      { className: "story-list" },
      developer.interpretation.points.map((point) =>
        h(
          "div",
          { key: point.title, className: "story-item" },
          h("strong", null, point.title),
          h("p", null, point.body)
        )
      )
    )
  );
}

function ActionCard({ developer }) {
  return h(
    "article",
    { className: "panel" },
    h("h3", null, "Suggested Next Steps"),
    h(
      "div",
      { className: "action-list" },
      developer.actions.map((action) =>
        h(
          "div",
          { key: action.title, className: "action-item" },
          h("span", { className: badgeClass("info") }, action.horizon),
          h("strong", null, action.title),
          h("p", null, action.detail)
        )
      )
    )
  );
}

function TrendCard({ developer }) {
  return h(
    "article",
    { className: "panel" },
    h("h3", null, "3-Month Trend"),
    h(
      "div",
      { className: "trend-list" },
      metricConfig.map((metric) =>
        h(
          "div",
          { key: metric.key, className: "trend-row" },
          h("span", { className: "trend-label" }, metric.label),
          h(
            "div",
            { className: "bars" },
            developer.trend[metric.key].map((value, index) =>
              h("div", {
                key: `${metric.key}-${index}`,
                className: "bar",
                style: {
                  height: `${normalizeBar(metric, value)}%`
                },
                title: formatMetric(metric, value)
              })
            )
          ),
          h("span", { className: "trend-last" }, formatMetric(metric, developer.metrics[metric.key]))
        )
      )
    )
  );
}

function DataCard({ developer, sourceSheets }) {
  return h(
    "article",
    { className: "panel" },
    h("h3", null, "Data Footing"),
    h(
      "div",
      { className: "source-table" },
      h(SourceRow, { label: "Issues completed", value: developer.sources.issuesDone }),
      h(SourceRow, { label: "Merged PRs", value: developer.sources.mergedPrs }),
      h(SourceRow, { label: "Prod deployments", value: developer.sources.productionDeployments }),
      h(SourceRow, { label: "Escaped bugs", value: developer.sources.escapedBugs })
    ),
    h("p", { className: "source-note" }, "This MVP assumes workbook-like source tables and computes simplified assignment metrics on the backend."),
    h(
      "div",
      { className: "sheet-list" },
      sourceSheets.map((sheet) => h("span", { key: sheet, className: "sheet-pill" }, sheet))
    )
  );
}

function SourceRow({ label, value }) {
  return h(
    "div",
    { className: "source-row" },
    h("span", null, label),
    h("strong", null, value)
  );
}

function ManagerView({ dashboard }) {
  return h(
    "section",
    { className: "manager-grid" },
    h(
      "article",
      { className: "panel manager-panel" },
      h("h3", null, "Team Snapshot"),
      h(
        "div",
        { className: "manager-list" },
        dashboard.developers.map((developer) =>
          h(
            "div",
            { key: developer.id, className: "manager-row" },
            h("strong", null, developer.name),
            h("span", null, developer.interpretation.managerLabel),
            h("p", null, developer.interpretation.summary)
          )
        )
      )
    ),
    h(
      "article",
      { className: "panel manager-panel" },
      h("h3", null, "Org Benchmarks"),
      metricConfig.map((metric) =>
        h(
          "div",
          { key: metric.key, className: "source-row" },
          h("span", null, metric.label),
          h("strong", null, formatMetric(metric, dashboard.orgBenchmarks[metric.key]))
        )
      )
    )
  );
}

function normalizeBar(metric, value) {
  if (metric.key === "bugRate") {
    return Math.max(15, value * 400);
  }
  return Math.max(15, Math.min(100, value * 9));
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
