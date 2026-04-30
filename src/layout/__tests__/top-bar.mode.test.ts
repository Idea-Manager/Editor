import { createDocument } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { TopBar } from '../top-bar';

function makeEnv(initialMode: 'text' | 'graphic' = 'text') {
  const doc = createDocument();
  const bus = new EventBus();
  const history = new UndoRedoManager(bus);
  const i18n = new I18nService('en');
  const onModeChange = jest.fn();
  const onDocReplace = jest.fn();

  const topBar = new TopBar({
    doc,
    eventBus: bus,
    undoRedoManager: history,
    i18n,
    onDocReplace,
    onModeChange,
    initialMode,
  });

  document.body.appendChild(topBar.element);
  return { topBar, onModeChange, onDocReplace };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TopBar mode segmented control', () => {
  it('renders two tab buttons with correct labels', () => {
    const { topBar } = makeEnv();
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    expect(tablist).toBeTruthy();
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].textContent).toBe('Text');
    expect(tabs[1].textContent).toBe('Graphic');
  });

  it('marks the initial mode button as active', () => {
    const { topBar } = makeEnv('text');
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    const textBtn = tablist.querySelector('[data-mode="text"]')!;
    const graphicBtn = tablist.querySelector('[data-mode="graphic"]')!;
    expect(textBtn.classList.contains('is-active')).toBe(true);
    expect(graphicBtn.classList.contains('is-active')).toBe(false);
  });

  it('marks graphic as active when initialMode is graphic', () => {
    const { topBar } = makeEnv('graphic');
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    const graphicBtn = tablist.querySelector('[data-mode="graphic"]')!;
    expect(graphicBtn.classList.contains('is-active')).toBe(true);
  });

  it('fires onModeChange with "graphic" when Graphic tab is clicked', () => {
    const { topBar, onModeChange } = makeEnv('text');
    const graphicBtn = topBar.element.querySelector('[data-mode="graphic"]') as HTMLButtonElement;
    graphicBtn.click();
    expect(onModeChange).toHaveBeenCalledTimes(1);
    expect(onModeChange).toHaveBeenCalledWith('graphic');
  });

  it('fires onModeChange with "text" when Text tab is clicked', () => {
    const { topBar, onModeChange } = makeEnv('graphic');
    const textBtn = topBar.element.querySelector('[data-mode="text"]') as HTMLButtonElement;
    textBtn.click();
    expect(onModeChange).toHaveBeenCalledWith('text');
  });

  it('switches active state when Graphic tab is clicked', () => {
    const { topBar } = makeEnv('text');
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    const graphicBtn = tablist.querySelector('[data-mode="graphic"]') as HTMLButtonElement;
    const textBtn = tablist.querySelector('[data-mode="text"]') as HTMLButtonElement;
    graphicBtn.click();
    expect(graphicBtn.classList.contains('is-active')).toBe(true);
    expect(textBtn.classList.contains('is-active')).toBe(false);
  });

  it('sets aria-selected correctly on click', () => {
    const { topBar } = makeEnv('text');
    const graphicBtn = topBar.element.querySelector('[data-mode="graphic"]') as HTMLButtonElement;
    graphicBtn.click();
    expect(graphicBtn.getAttribute('aria-selected')).toBe('true');
    const textBtn = topBar.element.querySelector('[data-mode="text"]') as HTMLButtonElement;
    expect(textBtn.getAttribute('aria-selected')).toBe('false');
  });

  it('switches mode on ArrowRight key', () => {
    const { topBar, onModeChange } = makeEnv('text');
    const textBtn = topBar.element.querySelector('[data-mode="text"]') as HTMLButtonElement;
    textBtn.focus();
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onModeChange).toHaveBeenCalledWith('graphic');
  });

  it('wraps around to text on ArrowLeft from first tab', () => {
    const { topBar, onModeChange } = makeEnv('text');
    const textBtn = topBar.element.querySelector('[data-mode="text"]') as HTMLButtonElement;
    textBtn.focus();
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(onModeChange).toHaveBeenCalledWith('graphic');
  });

  it('tablist has correct aria-label', () => {
    const { topBar } = makeEnv();
    const tablist = topBar.element.querySelector('[role="tablist"]')!;
    expect(tablist.getAttribute('aria-label')).toBe('Editor mode');
  });

  it('setMode() updates active class without calling onModeChange', () => {
    const { topBar, onModeChange } = makeEnv('text');
    topBar.setMode('graphic');
    const graphicBtn = topBar.element.querySelector('[data-mode="graphic"]') as HTMLButtonElement;
    expect(graphicBtn.classList.contains('is-active')).toBe(true);
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
