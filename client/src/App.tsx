import { useState, type FormEvent } from "react";
import { requestCoachReport } from "./api/coach";
import type { CoachResponse, GroupStats } from "./types";

const regions = [
  { value: "na", label: "North America" },
  { value: "eu", label: "Europe" },
  { value: "ap", label: "Asia Pacific" },
  { value: "kr", label: "Korea" },
  { value: "latam", label: "Latin America" },
  { value: "br", label: "Brazil" },
];

const formatDate = (date: string): string => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Recent match"
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
};

const StatCard = ({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) => (
  <article className={`stat-card${accent ? " stat-card-accent" : ""}`}>
    <p className="eyebrow">{label}</p>
    <p className="stat-value">{value}</p>
    <p className="stat-hint">{hint}</p>
  </article>
);

const GroupTable = ({
  title,
  groups,
  emptyMessage,
}: {
  title: string;
  groups: GroupStats[];
  emptyMessage: string;
}) => (
  <section className="panel group-panel">
    <div className="panel-heading">
      <div>
        <p className="eyebrow">BREAKDOWN</p>
        <h2>{title}</h2>
      </div>
    </div>
    {groups.length === 0 ? (
      <p className="muted empty-inline">{emptyMessage}</p>
    ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{title === "Agent performance" ? "Agent" : "Map"}</th>
              <th scope="col">Games</th>
              <th scope="col">Win %</th>
              <th scope="col">K/D</th>
              <th scope="col">ACS</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.name}>
                <th scope="row">{group.name}</th>
                <td>{group.matches}</td>
                <td>{group.winRate}%</td>
                <td>{group.kd.toFixed(2)}</td>
                <td>{group.averageAcs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

function App() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("na");
  const [matchCount, setMatchCount] = useState(10);
  const [report, setReport] = useState<CoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setReport(null);

    const separator = riotId.lastIndexOf("#");
    const name = riotId.slice(0, separator).trim();
    const tag = riotId.slice(separator + 1).trim();
    if (separator < 1 || !name || !tag) {
      setError("Enter your Riot ID in the format Name#TAG.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestCoachReport({
        name,
        tag,
        region,
        matchCount,
      });
      setReport(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while loading your match history.",
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = report?.stats;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Valorant Match Coach home">
          <span className="wordmark-mark" aria-hidden="true">
            V
          </span>
          <span>
            <strong>VALORANT</strong>
            <small>MATCH COACH</small>
          </span>
        </a>
        <p className="topbar-note">
          PERSONAL PERFORMANCE TOOL <span aria-hidden="true">/</span> UNOFFICIAL
        </p>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">YOUR NEXT ROUND STARTS HERE</p>
            <h1>
              Turn your
              <br />
              <span>matches into</span>
              <br />
              momentum.
            </h1>
            <p className="hero-description">
              Get a clear read on your recent performance, then take one useful
              idea into your next queue.
            </p>
          </div>

          <form className="lookup-card" onSubmit={handleSubmit}>
            <div className="lookup-heading">
              <span className="step-mark">01</span>
              <div>
                <p className="eyebrow">PLAYER LOOKUP</p>
                <h2>Build your report</h2>
              </div>
            </div>
            <label htmlFor="riot-id">Riot ID</label>
            <input
              autoComplete="off"
              id="riot-id"
              maxLength={49}
              onChange={(event) => setRiotId(event.target.value)}
              placeholder="PlayerName#TAG"
              required
              value={riotId}
            />
            <div className="form-row">
              <div>
                <label htmlFor="region">Region</label>
                <select
                  id="region"
                  onChange={(event) => setRegion(event.target.value)}
                  value={region}
                >
                  {regions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="match-count">Recent matches</label>
                <select
                  id="match-count"
                  onChange={(event) => setMatchCount(Number(event.target.value))}
                  value={matchCount}
                >
                  <option value={5}>5 matches</option>
                  <option value={10}>10 matches</option>
                  <option value={15}>15 matches</option>
                  <option value={20}>20 matches</option>
                </select>
              </div>
            </div>
            <button className="submit-button" disabled={loading} type="submit">
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Pulling match data
                </>
              ) : (
                <>
                  Analyze my matches <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
            <p className="privacy-note">
              Your Riot ID is only used to retrieve public match history.
            </p>
          </form>
        </section>

        {error && (
          <div className="notice error-notice" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {report && stats && (
          <section className="results" aria-live="polite">
            <div className="section-title">
              <div>
                <p className="eyebrow">MATCH INTELLIGENCE</p>
                <h2>
                  {report.player.name}
                  <span className="player-tag">#{report.player.tag}</span>
                </h2>
              </div>
              <span className="region-chip">
                {regions.find((item) => item.value === report.player.region)?.label ??
                  report.player.region}
                <span aria-hidden="true"> · </span>PC
              </span>
            </div>

            <div className="stats-grid">
              <StatCard
                accent
                hint={`${stats.wins}W — ${stats.losses}L`}
                label="WIN RATE"
                value={`${stats.winRate}%`}
              />
              <StatCard
                hint={`${stats.kills} kills / ${stats.deaths} deaths`}
                label="K / D"
                value={stats.kd.toFixed(2)}
              />
              <StatCard
                hint="Average combat score"
                label="AVG. ACS"
                value={String(stats.averageAcs)}
              />
              <StatCard
                hint={`${stats.matches} recent matches`}
                label="HEADSHOT %"
                value={`${stats.headshotPercent}%`}
              />
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-main">
                <GroupTable
                  emptyMessage="No agent breakdown available."
                  groups={stats.byAgent}
                  title="Agent performance"
                />
                <GroupTable
                  emptyMessage="No map breakdown available."
                  groups={stats.byMap}
                  title="Map performance"
                />
              </div>

              <aside className="coach-card">
                <div className="coach-card-heading">
                  <span className="coach-icon" aria-hidden="true">
                    ✳
                  </span>
                  <div>
                    <p className="eyebrow">AI COACH</p>
                    <h2>Round review</h2>
                  </div>
                </div>
                {report.coaching.report ? (
                  <>
                    <div className="coach-section">
                      <h3>Keep doing</h3>
                      <ul>
                        {report.coaching.report.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="coach-section">
                      <h3>Work on next</h3>
                      <ul>
                        {report.coaching.report.focusAreas.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="coach-tip">
                      <p className="eyebrow">ONE THING TO TRY</p>
                      <p>{report.coaching.report.tip}</p>
                    </div>
                  </>
                ) : (
                  <p className="coach-unavailable">
                    {report.coaching.message ??
                      "Coaching feedback is not available for this report."}
                  </p>
                )}
              </aside>
            </div>

            <section className="panel recent-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">LATEST SESSIONS</p>
                  <h2>Recent matches</h2>
                </div>
                <span className="muted">{stats.recentMatches.length} matches</span>
              </div>
              <div className="match-list">
                {stats.recentMatches.map((match) => (
                  <article className="match-row" key={match.matchId}>
                    <span
                      className={`match-result${match.won ? " is-win" : " is-loss"}`}
                      aria-label={match.won ? "Victory" : "Defeat"}
                    >
                      {match.won ? "W" : "L"}
                    </span>
                    <div className="match-map">
                      <strong>{match.mapName}</strong>
                      <span>
                        {match.queueName ?? "Match"} · {formatDate(match.startedAt)}
                      </span>
                    </div>
                    <div className="match-agent">
                      <span className="eyebrow">AGENT</span>
                      <strong>{match.agentName}</strong>
                    </div>
                    <div className="match-kda">
                      <span className="eyebrow">K / D / A</span>
                      <strong>
                        {match.kills} / {match.deaths} / {match.assists}
                      </strong>
                    </div>
                    <div className="match-acs">
                      <span className="eyebrow">ACS</span>
                      <strong>
                        {match.roundCount > 0
                          ? Math.round(match.score / match.roundCount)
                          : "—"}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>

      {!report && !error && (
        <section className="empty-state">
          <div className="empty-crosshair" aria-hidden="true">
            <span />
          </div>
          <p className="eyebrow">THE CLIMB IS BUILT ROUND BY ROUND</p>
          <p>
            Search your Riot ID to see the details behind your last set of
            matches.
          </p>
        </section>
      )}

      <footer className="site-footer">
        <p>
          Unofficial fan-made tool. Not affiliated with or endorsed by Riot
          Games.
        </p>
        <span>STATS FIRST. COACHING SECOND.</span>
      </footer>
    </div>
  );
}

export default App;
