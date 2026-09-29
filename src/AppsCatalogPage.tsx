import { useState, type FormEvent } from "react";

export type AppSupportStatus = "supported" | "unsupported" | "not-tested";

export type AppCatalogItem = {
  id: string;
  name: string;
  platform: string;
  description: string;
};

type AppsCatalogPageProps = {
  items: AppCatalogItem[];
  isAdmin: boolean;
  onSave: (appItem: AppCatalogItem) => Promise<void>;
  onDelete: (appItem: AppCatalogItem) => Promise<boolean>;
};

export default function AppsCatalogPage({
  items,
  isAdmin,
  onSave,
  onDelete,
}: AppsCatalogPageProps) {
  const [editing, setEditing] = useState<AppCatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("Windows");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const openForm = (appItem?: AppCatalogItem) => {
    setEditing(appItem ?? null);
    setName(appItem?.name ?? "");
    setPlatform(appItem?.platform ?? "Windows");
    setDescription(appItem?.description ?? "");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setPlatform("Windows");
    setDescription("");
    setError("");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const appItem: AppCatalogItem = {
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      platform,
      description: description.trim(),
    };
    try {
      await onSave(appItem);
      setNotice(
        `${appItem.name} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`,
      );
      closeForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "App tidak dapat disimpan.",
      );
    }
  };

  const handleDelete = async (appItem: AppCatalogItem) => {
    try {
      if (await onDelete(appItem)) {
        setNotice(`${appItem.name} dihapus dari katalog.`);
      }
    } catch (deleteError) {
      setNotice(
        deleteError instanceof Error
          ? deleteError.message
          : "App tidak dapat dihapus.",
      );
    }
  };

  return (
    <div className="page-content inner-page apps-catalog-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">APP CENTER</p>
          <h1>Katalog Apps</h1>
          <p className="welcome-copy">
            Kelola aplikasi yang akan dicatat dukungannya pada printer thermal.
          </p>
        </div>
        {isAdmin && (
          <button className="button-primary" onClick={() => openForm()}>
            + Tambah app
          </button>
        )}
      </div>

      {notice && (
        <div className="user-notice" role="status">
          {notice}
          <button
            aria-label="Tutup pemberitahuan"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      {showForm && isAdmin && (
        <form className="apps-editor panel" onSubmit={handleSave}>
          <div className="form-heading">
            <span className="form-icon" aria-hidden="true">
              A
            </span>
            <div>
              <h2>{editing ? "Edit app" : "Tambah app"}</h2>
              <p>Informasi ini akan tersedia saat mengatur dukungan printer.</p>
            </div>
          </div>
          <div className="apps-editor-fields">
            <label className="field-label">
              Nama app
              <input
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Pawoon POS"
              />
            </label>
            <label className="field-label">
              Platform
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                <option>Windows</option>
                <option>Android</option>
                <option>iOS</option>
                <option>macOS</option>
                <option>Web</option>
                <option>Multi-platform</option>
                <option>Lainnya</option>
              </select>
            </label>
            <label className="field-label apps-editor-description">
              Deskripsi <span className="optional-label">Opsional</span>
              <textarea
                maxLength={220}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Keterangan singkat tentang aplikasi"
              />
            </label>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="apps-editor-footer">
            <button
              type="button"
              className="button-secondary"
              onClick={closeForm}
            >
              Batal
            </button>
            <button type="submit" className="button-primary">
              {editing ? "Simpan perubahan" : "Simpan app"}
            </button>
          </div>
        </form>
      )}

      <section className="apps-catalog-list">
        <div className="section-heading">
          <div>
            <h2>Semua Apps</h2>
            <p>{items.length} app terdaftar</p>
          </div>
          <span className="count-pill">{items.length} APP</span>
        </div>
        {items.length > 0 ? (
          <div className="apps-catalog-grid">
            {items.map((appItem) => (
              <article className="apps-catalog-card" key={appItem.id}>
                <span className="apps-catalog-icon" aria-hidden="true">
                  A
                </span>
                <div className="apps-catalog-copy">
                  <h3>{appItem.name}</h3>
                  <span>{appItem.platform}</span>
                  {appItem.description && <p>{appItem.description}</p>}
                </div>
                {isAdmin && (
                  <div className="apps-catalog-actions">
                    <button onClick={() => openForm(appItem)}>Edit</button>
                    <button onClick={() => void handleDelete(appItem)}>
                      Hapus
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Belum ada app</h3>
            <p>
              Tambahkan app agar status dukungannya dapat diatur per printer.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
