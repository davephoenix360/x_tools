import { type FormEvent, useEffect, useState } from "react";
import type { Settings } from "../lib/settings";

interface SettingsPageProps {
  settings: Settings;
  isLoading: boolean;
  isSaving: boolean;
  feedback: string | null;
  error: string | null;
  onSave: (nextSettings: Settings) => Promise<void>;
}

export default function SettingsPage({
  settings,
  isLoading,
  isSaving,
  feedback,
  error,
  onSave,
}: SettingsPageProps) {
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const updateSourceFolder = (index: number, value: string) => {
    const nextFolders = [...draft.sourceFolders];
    nextFolders[index] = value;
    setDraft({ ...draft, sourceFolders: nextFolders });
  };

  const addSourceFolder = () => {
    setDraft({ ...draft, sourceFolders: [...draft.sourceFolders, ""] });
  };

  const removeSourceFolder = (index: number) => {
    setDraft({
      ...draft,
      sourceFolders: draft.sourceFolders.filter((_, folderIndex) => {
        return folderIndex !== index;
      }),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSettings: Settings = {
      ...draft,
      sourceFolders: draft.sourceFolders
        .map((folder) => folder.trim())
        .filter(Boolean),
      hotkey: draft.hotkey.trim() || settings.hotkey,
    };

    await onSave(normalizedSettings);
  };

  return (
    <div className="page">
      <section className="panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Application Preferences</h1>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setDraft(settings)}
            disabled={isSaving}
          >
            Reset Form
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Global hotkey</span>
            <input
              value={draft.hotkey}
              onChange={(event) =>
                setDraft({ ...draft, hotkey: event.target.value })
              }
              placeholder="Ctrl+Shift+Space"
              disabled={isLoading || isSaving}
            />
          </label>

          <label className="field">
            <span>OCR engine</span>
            <select
              value={draft.ocrEngine}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  ocrEngine: event.target.value as Settings["ocrEngine"],
                })
              }
              disabled={isLoading || isSaving}
            >
              <option value="windows-native">Windows Native</option>
              <option value="tesseract">Tesseract</option>
            </select>
          </label>

          <label className="field">
            <span>Model mode</span>
            <select
              value={draft.modelMode}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  modelMode: event.target.value as Settings["modelMode"],
                })
              }
              disabled={isLoading || isSaving}
            >
              <option value="local">Local</option>
              <option value="cloud">Cloud</option>
            </select>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draft.launchOnStartup}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  launchOnStartup: event.target.checked,
                })
              }
              disabled={isLoading || isSaving}
            />
            <span>Launch on startup</span>
          </label>

          <div className="field-group">
            <div className="section-header">
              <div>
                <span className="field-label">Source folders</span>
                <p className="muted">
                  Paths are stored now so the indexing pipeline can plug in
                  later.
                </p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={addSourceFolder}
                disabled={isLoading || isSaving}
              >
                Add folder
              </button>
            </div>

            {draft.sourceFolders.length === 0 ? (
              <div className="empty-state">
                <p>No folders added yet.</p>
              </div>
            ) : (
              <div className="folder-list">
                {draft.sourceFolders.map((folder, index) => (
                  <div className="folder-row" key={`${index}-${folder}`}>
                    <input
                      value={folder}
                      onChange={(event) =>
                        updateSourceFolder(index, event.target.value)
                      }
                      placeholder="C:\\Users\\You\\Documents"
                      disabled={isLoading || isSaving}
                    />
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => removeSourceFolder(index)}
                      disabled={isLoading || isSaving}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {feedback ? <p className="message success">{feedback}</p> : null}
          {error ? <p className="message error">{error}</p> : null}
          <p className="muted">
            Saving immediately re-registers the global hotkey used to launch the
            capture overlay.
          </p>

          <div className="actions">
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
