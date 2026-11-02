const STATE_TEXT = {
  idle: { status: "Not saved for offline", action: "Save" },
  saved: { status: "Available offline", action: "Remove" },
  failed: { status: "Could not save. Please try again.", action: "Save" },
};

export function createOfflineControl({ root, status, action, offline }) {
  const saving = new Map();
  let edition = null;
  let state = "idle";
  let renderId = 0;

  function display(nextState) {
    state = nextState;
    const progress = saving.get(edition.id);
    const text = nextState === "saving"
      ? { status: progress?.total ? `Saving ${progress.done} of ${progress.total}…` : "Saving…", action: "Save" }
      : STATE_TEXT[nextState];
    root.dataset.state = nextState;
    status.setAttribute("aria-live", nextState === "saving" ? "off" : "polite");
    status.textContent = text.status;
    action.textContent = text.action;
    action.disabled = nextState === "saving";
  }

  function displayIfActive(target, nextState) {
    if (edition?.id === target.id) display(nextState);
  }

  async function render(nextEdition) {
    edition = nextEdition;
    root.hidden = !offline.supported;
    if (!offline.supported) return;

    if (saving.has(edition.id)) {
      display("saving");
      return;
    }
    const requestId = ++renderId;
    const saved = await offline.isSaved(edition);
    if (requestId === renderId) display(saved ? "saved" : "idle");
  }

  async function save(target) {
    saving.set(target.id, { done: 0, total: 0 });
    displayIfActive(target, "saving");
    let outcome = "saved";
    try {
      await offline.save(target, (done, total) => {
        saving.set(target.id, { done, total });
        displayIfActive(target, "saving");
      });
    } catch {
      outcome = "failed";
    }
    saving.delete(target.id);
    displayIfActive(target, outcome);
  }

  action.addEventListener("click", async () => {
    const target = edition;
    if (!target || saving.has(target.id)) return;

    if (state === "saved") {
      await offline.remove(target);
      if (edition.id === target.id) await render(edition);
    } else {
      await save(target);
    }
  });

  return { render };
}
