import { BookOpenText, GitBranch, LayoutDashboard, PlugZap, RadioTower } from "lucide-react";
import type { Locale, Messages } from "../../../packages/admin/src/i18n";
import type { Task } from "../../../packages/admin/src/types";

export type AppTab = "overview" | "plan" | "wiki" | "integrations" | "plugins";

export function CapabilityRail(props: { capabilities: string[]; messages: Messages }) {
  return (
    <ul className="capability-rail" aria-label={props.messages.plugins.capabilities}>
      {props.capabilities.map((capability) => (
        <li key={capability}>{capability}</li>
      ))}
    </ul>
  );
}

export function Metric(props: { label: string; value: number; tone?: "hot" }) {
  return (
    <article className={props.tone === "hot" ? "metric hot" : "metric"}>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </article>
  );
}

export function PanelTitle(props: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <header className="panel-title">
      <div>
        {props.icon}
        <strong>{props.title}</strong>
      </div>
      <small>{props.meta}</small>
    </header>
  );
}

export function Progress(props: { value: number }) {
  return (
    <div className="progress-cell">
      <span>{props.value}%</span>
      <i>
        <b style={{ width: `${props.value}%` }} />
      </i>
    </div>
  );
}

export function tabIcon(tab: AppTab) {
  if (tab === "overview") return <LayoutDashboard size={17} />;
  if (tab === "plan") return <GitBranch size={17} />;
  if (tab === "wiki") return <BookOpenText size={17} />;
  if (tab === "integrations") return <RadioTower size={17} />;
  return <PlugZap size={17} />;
}

export function timelineBounds(tasks: Task[]) {
  const dates = tasks
    .flatMap((task) => [task.starts_on, task.due_on].filter(Boolean))
    .map((date) => new Date(String(date)).getTime());
  const min = dates.length ? Math.min(...dates) : Date.now();
  const max = dates.length ? Math.max(...dates) : Date.now() + 86_400_000;
  return { min, span: Math.max(1, max - min) };
}

export function timelinePosition(task: Task, bounds: { min: number; span: number }) {
  const start = task.starts_on ? new Date(task.starts_on).getTime() : bounds.min;
  const end = task.due_on ? new Date(task.due_on).getTime() : start + 86_400_000;
  const left = Math.max(0, ((start - bounds.min) / bounds.span) * 100);
  const width = Math.max(5, ((end - start) / bounds.span) * 100);
  return { left, width };
}

export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
