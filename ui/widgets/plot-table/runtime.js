import { graphicsTabForRole } from "../graphics-console/widget.js";
import { escapeHtml } from "../shared/plots/style.js";

/** Select a declared plot/table tab and its bound, application-neutral data entries. */
export function selectPlotTableView({ scene, selectedTabId, inputs = {}, fallbackEntries = [] } = {}) {
  const plotTab = graphicsTabForRole(scene, 'plot');
  const tableTab = graphicsTabForRole(scene, 'table');
  if (scene?.kind !== 'tabs' || !plotTab || !tableTab) {
    throw new Error('The plot/table scene needs plot and table tabs.');
  }
  const tabs = [plotTab, tableTab];
  const activeTab = tabs.find((tab) => tab.id === selectedTabId)
    || tabs.find((tab) => tab.id === scene.defaultTab) || plotTab;
  const boundEntries = inputs[activeTab.input];
  return { plotTab, tableTab, tabs, activeTab, isPlot: activeTab === plotTab,
    entries: Array.isArray(boundEntries) ? boundEntries : fallbackEntries };
}

/** Render the shared tabs and optional figure action into a host-owned toolbar. */
export function renderPlotTableToolbar({ host, tabs, activeTab, sourceSummary = '', freshnessText = '',
  saveInfo = {}, onTabSelect, saveLabel = 'Save figure', viewLabel = 'Result view' } = {}) {
  if (!host) throw new Error('The plot/table widget needs a toolbar host.');
  const canSave = Boolean(saveInfo.enabled);
  const saveReason = canSave ? '' : saveInfo.reason || 'This result has no configured figure save action.';
  host.innerHTML = `<div role="group" aria-label="${escapeHtml(viewLabel)}">${tabs.map((tab) =>
    `<button class="button${activeTab.id === tab.id ? ' active' : ''}" type="button" data-plot-table-tab="${escapeHtml(tab.id)}" aria-pressed="${activeTab.id === tab.id}">${escapeHtml(tab.label)}</button>`).join('')}</div>`
    + `<span class="result-source-summary">${escapeHtml(sourceSummary)}</span>`
    + (freshnessText ? `<span class="result-freshness-warning" role="status">${escapeHtml(freshnessText)}</span>` : '')
    + `<button class="button primary" type="button" data-plot-table-save data-plot-table-can-save="${canSave}" title="${escapeHtml(saveReason)}" ${canSave ? '' : 'disabled'}>${escapeHtml(saveLabel)}</button>`
    + `<span data-plot-table-save-status>${escapeHtml(saveInfo.label || '')}</span>`
    + (saveReason ? `<span class="result-save-reason" role="status">Save unavailable: ${escapeHtml(saveReason)}</span>` : '');
  for (const button of host.querySelectorAll('[data-plot-table-tab]')) {
    button.addEventListener('click', () => onTabSelect?.(button.dataset.plotTableTab));
  }
  return { saveButton: host.querySelector('[data-plot-table-save]'),
    saveStatus: host.querySelector('[data-plot-table-save-status]') };
}

/** Switch the plot, legend, and table hosts without knowing the source application. */
export function showPlotTableView({ canvas, table, legend, messageHost, isPlot, hasData, missingText = '' } = {}) {
  canvas.hidden = !hasData || !isPlot;
  legend.hidden = !isPlot;
  legend.replaceChildren();
  table.hidden = isPlot;
  messageHost.hidden = !missingText;
  messageHost.textContent = missingText;
}

/** Render selected normalized tables using the scene's registered table renderer. */
export function renderPlotTableSections({ host, entries = [], renderer, columnsForEntry, titleForEntry,
  resizeKeyForEntry, emptyMessage = 'No rows match the selected data.' } = {}) {
  if (typeof renderer !== 'function') throw new Error('The plot/table scene has no table renderer.');
  const messageFor = (entry) => {
    const view = entry?.view;
    const data = view?.value || view?.data || view;
    const error = data?.error ?? view?.error ?? entry?.error ?? entry?.missing;
    if (error) return typeof error === 'string' ? error : error.message || 'Table data is unavailable.';
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || !Array.isArray(data.columns) || !Array.isArray(data.rows)) return 'Table rows and columns must be arrays.';
    return '';
  };
  const errors = entries.map((entry,index)=>({entry,index,message:messageFor(entry)})).filter(item=>item.message);
  const sections = entries.map((entry,index)=>({entry,index})).filter(({entry})=>!messageFor(entry)&&entry.view.rows.length)
    .map(({entry,index}) => {
      const html = renderer({ view: entry.view, columns: columnsForEntry(entry),
        resizeKey: resizeKeyForEntry(entry, index) });
      return `<section class="result-table-section"><h3>${escapeHtml(titleForEntry(entry))}</h3>${html}</section>`;
    }).join('')
    + errors.map(({entry,index,message})=>`<p role="alert" data-table-error="${escapeHtml(entry?.id||index)}">Table error: ${escapeHtml(message)}</p>`).join('');
  host.innerHTML = sections || errors.length ? sections : `<p role="status">${escapeHtml(emptyMessage)}</p>`;
}
