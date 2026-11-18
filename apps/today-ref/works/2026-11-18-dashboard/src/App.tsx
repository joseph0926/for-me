import { useState } from "react";

import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { ListCard } from "./components/ListCard";
import { MetricPanel } from "./components/MetricPanel";
import { LiveCount, PageTitle, TopBar } from "./components/PageHeader";
import { Sidebar } from "./components/Sidebar";
import {
  addFilter,
  buildDashboard,
  DIMENSION_GROUPS,
  siteInfo,
  type DimensionId,
  type Filter,
  type PeriodId,
  type SiteId,
} from "./data";
import type { MetricId } from "./metrics";
import { findPage, type PageId } from "./pages";

export function App() {
  const [pageId, setPageId] = useState<PageId>("store");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodId>("7d");
  const [metricId, setMetricId] = useState<MetricId>("visitors");

  const { page, group } = findPage(pageId);
  const trail = group.label ? [group.label, page.label] : [page.label];

  const navigate = (id: PageId) => {
    setPageId(id);
    setDrawerOpen(false);
  };

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        activeId={pageId}
        onNavigate={navigate}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <TopBar trail={trail} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {page.kind === "site" ? (
            // 필터 값은 사이트마다 달라서 사이트가 바뀌면 비운다. 기간과 지표는 이어 간다.
            <SiteDashboard
              key={page.site}
              site={page.site}
              period={period}
              onPeriodChange={setPeriod}
              metricId={metricId}
              onMetricChange={setMetricId}
            />
          ) : (
            <>
              <PageTitle title={page.label} />
              <EmptyState icon={page.icon} title={page.emptyTitle} body={page.emptyBody} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

interface SiteDashboardProps {
  site: SiteId;
  period: PeriodId;
  onPeriodChange: (period: PeriodId) => void;
  metricId: MetricId;
  onMetricChange: (id: MetricId) => void;
}

function SiteDashboard({ site, period, onPeriodChange, metricId, onMetricChange }: SiteDashboardProps) {
  const [filters, setFilters] = useState<Filter[]>([]);

  const info = siteInfo(site);
  const dashboard = buildDashboard(site, period, filters);

  const handleAdd = (filter: Filter) => setFilters((current) => addFilter(current, filter));
  const handleRemove = (dimension: DimensionId) =>
    setFilters((current) => current.filter((f) => f.dimension !== dimension));

  return (
    <>
      <PageTitle title={info.name}>
        <span>{info.domain}</span>
        <span className="h-3 w-px bg-line" />
        <LiveCount initial={info.live} />
      </PageTitle>

      <div className="mt-5">
        <FilterBar
          filters={filters}
          lists={dashboard.lists}
          period={period}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onClear={() => setFilters([])}
          onPeriodChange={onPeriodChange}
        />
      </div>

      <div className="mt-3">
        <MetricPanel dashboard={dashboard} period={period} metricId={metricId} onMetricChange={onMetricChange} />
      </div>

      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        {DIMENSION_GROUPS.map((group) => (
          <ListCard key={group.label} dimensions={group.dimensions} lists={dashboard.lists} onSelect={handleAdd} />
        ))}
      </div>
    </>
  );
}
