const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const dataPath = path.join(__dirname, "data", "dashboard.json");
const publicDir = path.join(__dirname, "public");
const vendorFiles = {
  "/vendor/react.js": path.join(__dirname, "node_modules", "react", "umd", "react.development.js"),
  "/vendor/react-dom.js": path.join(__dirname, "node_modules", "react-dom", "umd", "react-dom.development.js")
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function loadDashboard() {
  const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const orgBenchmarks = buildOrgBenchmarks(raw.developers);

  return {
    month: raw.month,
    sourceSheets: raw.sourceSheets,
    orgBenchmarks,
    developers: raw.developers.map((developer) => {
      const interpretation = buildInterpretation(developer, orgBenchmarks);
      const actions = buildActions(developer, interpretation);
      return {
        ...developer,
        interpretation,
        actions
      };
    })
  };
}

function buildOrgBenchmarks(developers) {
  return metricAverages(developers.map((developer) => developer.metrics));
}

function metricAverages(metricsList) {
  const metrics = {
    leadTimeDays: 0,
    cycleTimeDays: 0,
    bugRate: 0,
    deploymentFrequency: 0,
    prThroughput: 0
  };

  metricsList.forEach((entry) => {
    Object.keys(metrics).forEach((key) => {
      metrics[key] += entry[key];
    });
  });

  Object.keys(metrics).forEach((key) => {
    metrics[key] = Number((metrics[key] / metricsList.length).toFixed(2));
  });

  return metrics;
}

function buildInterpretation(developer, benchmarks) {
  const { metrics } = developer;
  const points = [];
  let managerLabel = "Healthy flow";

  if (metrics.cycleTimeDays > benchmarks.cycleTimeDays) {
    points.push({
      title: "Execution drag",
      body: "Cycle time is above the team baseline, so work is likely staying in progress too long before reaching done."
    });
    managerLabel = "Execution slowdown";
  }

  if (metrics.leadTimeDays - metrics.cycleTimeDays > 1.5) {
    points.push({
      title: "Release bottleneck",
      body: "Lead time is stretching well beyond cycle time, which suggests delay after coding is complete: review, QA, or deployment batching."
    });
    managerLabel = "Release friction";
  }

  if (metrics.bugRate > benchmarks.bugRate) {
    points.push({
      title: "Quality pressure",
      body: "Escaped bugs are above the current team pattern, so speed gains are probably being offset by follow-up cleanup."
    });
    managerLabel = "Quality risk";
  }

  if (metrics.prThroughput < benchmarks.prThroughput && metrics.cycleTimeDays > benchmarks.cycleTimeDays) {
    points.push({
      title: "Too much work-in-progress",
      body: "Lower throughput plus longer cycle time often means the developer is juggling too many partial tasks or handling unclear tickets."
    });
  }

  if (!points.length) {
    points.push({
      title: "Balanced delivery loop",
      body: "This developer is shipping at a healthy cadence with quality holding steady, so the current workflow looks sustainable."
    });
  }

  const summary = summarize(points, developer);
  return { summary, points, managerLabel };
}

function summarize(points, developer) {
  if (points[0].title === "Balanced delivery loop") {
    return `${developer.name} appears to be in a strong delivery rhythm: work is moving through implementation, merge, and release without obvious stress signals.`;
  }

  return `${developer.name} is showing a mixed picture. The metrics suggest that the biggest opportunity is to remove friction from the delivery path while protecting quality.`;
}

function buildActions(developer, interpretation) {
  const actions = [];
  const { metrics } = developer;

  if (metrics.leadTimeDays - metrics.cycleTimeDays > 1.5) {
    actions.push({
      horizon: "This week",
      title: "Audit post-merge wait time",
      detail: "Check where merged work waits the longest: code review completion, QA handoff, release approval, or deployment window."
    });
  }

  if (metrics.bugRate > 0.12) {
    actions.push({
      horizon: "Next sprint",
      title: "Add a quality guardrail",
      detail: "Pick one repeatable safeguard such as a release checklist, smoke-test script, or tighter PR definition of done."
    });
  }

  if (metrics.cycleTimeDays > 6) {
    actions.push({
      horizon: "Today",
      title: "Reduce work in progress",
      detail: "Split large tickets and cap concurrent tasks so fewer items sit half-finished."
    });
  }

  if (!actions.length && interpretation.points[0].title === "Balanced delivery loop") {
    actions.push({
      horizon: "Keep doing",
      title: "Preserve the current flow",
      detail: "Document the habits behind this performance so the team can reuse them: smaller PRs, frequent merges, and quick deploys."
    });
    actions.push({
      horizon: "Stretch goal",
      title: "Share one team practice",
      detail: "Turn one working habit into a lightweight checklist or pairing pattern for others."
    });
  }

  if (actions.length === 1) {
    actions.push({
      horizon: "Optional",
      title: "Review one month of ticket sizing",
      detail: "A quick ticket-size audit helps confirm whether the friction is process related or simply due to oversized work."
    });
  }

  return actions;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const parsed = url.parse(request.url, true);

  if (parsed.pathname === "/api/dashboard") {
    sendJson(response, 200, loadDashboard());
    return;
  }

  if (vendorFiles[parsed.pathname]) {
    serveFile(vendorFiles[parsed.pathname], response);
    return;
  }

  const requestedPath = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  serveFile(filePath, response);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Developer Productivity MVP running at http://localhost:${port}`);
});
