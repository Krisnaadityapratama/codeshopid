import { useState } from "react";

export type DipSwitchSetting = {
  dipNumber: string;
  purpose: string;
};

export type ProductDocumentation = {
  id: string;
  productName: string;
  description: string;
  hasDipSwitch: boolean;
  sectionTitle?: string;
  firstColumnTitle?: string;
  dipSwitches: DipSwitchSetting[];
  updatedAt: string;
};

type Props = {
  items: ProductDocumentation[];
  isAdmin: boolean;
  onSave: (item: ProductDocumentation) => Promise<void>;
  onDelete: (item: ProductDocumentation) => Promise<boolean>;
};

const newDipSwitch = (): DipSwitchSetting => ({ dipNumber: "", purpose: "" });

export default function ProductDocumentationPage({
  items,
  isAdmin,
  onSave,
  onDelete,
}: Props) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [hasDipSwitch, setHasDipSwitch] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("DIP Switch");
  const [firstColumnTitle, setFirstColumnTitle] = useState("Nomor DIP");
  const [dipSwitches, setDipSwitches] = useState<DipSwitchSetting[]>([]);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setProductName("");
    setDescription("");
    setHasDipSwitch(false);
    setSectionTitle("DIP Switch");
    setFirstColumnTitle("Nomor DIP");
    setDipSwitches([]);
    setFormError("");
  };

  const openForm = (item?: ProductDocumentation) => {
    setNotice("");
    setFormError("");
    setEditingId(item?.id ?? null);
    setProductName(item?.productName ?? "");
    setDescription(item?.description ?? "");
    setHasDipSwitch(item?.hasDipSwitch ?? false);
    setSectionTitle(item?.sectionTitle ?? "DIP Switch");
    setFirstColumnTitle(item?.firstColumnTitle ?? "Nomor DIP");
    setDipSwitches(item?.dipSwitches ?? []);
    setShowForm(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const normalizedDipSwitches = hasDipSwitch
      ? dipSwitches.map((setting) => ({
          dipNumber: setting.dipNumber.trim(),
          purpose: setting.purpose.trim(),
        }))
      : [];

    if (hasDipSwitch && (!sectionTitle.trim() || !firstColumnTitle.trim())) {
      setFormError("Isi judul bagian dan judul kolom kiri.");
      return;
    }

    if (
      hasDipSwitch &&
      (normalizedDipSwitches.length === 0 ||
        normalizedDipSwitches.some(
          (setting) => !setting.dipNumber || !setting.purpose,
        ))
    ) {
      setFormError("Lengkapi nomor DIP dan kegunaannya pada setiap baris.");
      return;
    }

    const item: ProductDocumentation = {
      id: editingId ?? crypto.randomUUID(),
      productName: productName.trim(),
      description: description.trim(),
      hasDipSwitch,
      sectionTitle: hasDipSwitch ? sectionTitle.trim() : "DIP Switch",
      firstColumnTitle: hasDipSwitch ? firstColumnTitle.trim() : "Nomor DIP",
      dipSwitches: normalizedDipSwitches,
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(item);
      setNotice(`Dokumentasi ${item.productName} berhasil disimpan.`);
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Dokumentasi produk tidak dapat disimpan.",
      );
    }
  };

  const remove = async (item: ProductDocumentation) => {
    try {
      if (await onDelete(item)) {
        setNotice(`Dokumentasi ${item.productName} telah dihapus.`);
        if (editingId === item.id) resetForm();
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Dokumentasi produk tidak dapat dihapus.",
      );
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = items.filter((item) =>
    [
      item.productName,
      item.description,
      item.sectionTitle ?? "DIP Switch",
      item.firstColumnTitle ?? "Nomor DIP",
      ...item.dipSwitches.flatMap((setting) => [
        setting.dipNumber,
        setting.purpose,
      ]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch),
  );

  return (
    <div className="page-content inner-page product-documentation-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">RESOURCES</p>
          <h1>Dokumentasi Produk</h1>
          <p className="welcome-copy">
            Catatan setting unit dan pengaturan khusus per produk.
          </p>
        </div>
        {isAdmin && !showForm && (
          <button className="button-primary" onClick={() => openForm()}>
            + Dokumentasi baru
          </button>
        )}
      </div>

      {notice && (
        <p className="product-documentation-notice" role="status">
          {notice}
        </p>
      )}

      {showForm && isAdmin && (
        <form className="product-documentation-form panel" onSubmit={save}>
          <div className="form-heading">
            <div>
              <h2>{editingId ? "Edit dokumentasi" : "Dokumentasi baru"}</h2>
              <p>Isi informasi produk dan pengaturan yang perlu diketahui.</p>
            </div>
          </div>

          <div className="product-documentation-fields">
            <label className="field-label">
              Nama produk
              <input
                required
                maxLength={120}
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Contoh: Kassen KS-603"
              />
            </label>
            <label className="field-label">
              Deskripsi dan penjelasan
              <textarea
                required
                rows={4}
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Jelaskan pengaturan unit atau informasi penting produk."
              />
            </label>
          </div>

          <fieldset className="dip-switch-fieldset">
            <legend>Pengaturan tambahan</legend>
            <p className="dip-switch-question">
              Apakah produk ini memiliki daftar pengaturan?
            </p>
            <div
              className="dip-switch-choice"
              role="group"
              aria-label="Daftar pengaturan tersedia"
            >
              <button
                type="button"
                aria-pressed={!hasDipSwitch}
                className={!hasDipSwitch ? "selected" : ""}
                onClick={() => {
                  setHasDipSwitch(false);
                  setDipSwitches([]);
                }}
              >
                Tidak ada
              </button>
              <button
                type="button"
                aria-pressed={hasDipSwitch}
                className={hasDipSwitch ? "selected" : ""}
                onClick={() => {
                  setHasDipSwitch(true);
                  setDipSwitches((current) =>
                    current.length ? current : [newDipSwitch()],
                  );
                }}
              >
                Ada
              </button>
            </div>

            {hasDipSwitch && (
              <div className="dip-switch-editor">
                <div className="dip-switch-title-fields">
                  <label className="field-label">
                    Judul bagian
                    <input
                      required
                      maxLength={80}
                      value={sectionTitle}
                      onChange={(event) => setSectionTitle(event.target.value)}
                      placeholder="Contoh: DIP Switch atau Setting Unit"
                    />
                  </label>
                  <label className="field-label">
                    Judul kolom kiri
                    <input
                      required
                      maxLength={80}
                      value={firstColumnTitle}
                      onChange={(event) =>
                        setFirstColumnTitle(event.target.value)
                      }
                      placeholder="Contoh: Nomor DIP"
                    />
                  </label>
                </div>
                <div className="dip-switch-column-labels" aria-hidden="true">
                  <span>{firstColumnTitle || "Judul kolom kiri"}</span>
                  <span>Penjelasan kegunaan</span>
                  <span />
                </div>
                {dipSwitches.map((setting, index) => (
                  <div className="dip-switch-row" key={index}>
                    <label className="field-label">
                      <span className="visually-hidden">
                        {firstColumnTitle} {index + 1}
                      </span>
                      <input
                        required
                        maxLength={40}
                        value={setting.dipNumber}
                        onChange={(event) =>
                          setDipSwitches((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, dipNumber: event.target.value }
                                : row,
                            ),
                          )
                        }
                        placeholder="Contoh: DIP 1-2"
                      />
                    </label>
                    <label className="field-label">
                      <span className="visually-hidden">
                        Penjelasan kegunaan DIP {index + 1}
                      </span>
                      <input
                        required
                        maxLength={300}
                        value={setting.purpose}
                        onChange={(event) =>
                          setDipSwitches((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, purpose: event.target.value }
                                : row,
                            ),
                          )
                        }
                        placeholder="Contoh: Mengatur kecepatan komunikasi"
                      />
                    </label>
                    <button
                      type="button"
                      className="dip-switch-remove"
                      aria-label={`Hapus baris pengaturan ${index + 1}`}
                      onClick={() =>
                        setDipSwitches((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setDipSwitches((current) => [...current, newDipSwitch()])
                  }
                >
                  + Tambah baris pengaturan
                </button>
              </div>
            )}
          </fieldset>

          {formError && (
            <p className="product-documentation-error" role="alert">
              {formError}
            </p>
          )}
          <div className="product-documentation-form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={resetForm}
            >
              Batal
            </button>
            <button type="submit" className="button-primary">
              Simpan dokumentasi
            </button>
          </div>
        </form>
      )}

      <div className="product-documentation-toolbar">
        <label className="filter-search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari produk atau pengaturan..."
            aria-label="Cari dokumentasi produk"
          />
        </label>
        <span>{visibleItems.length} dokumentasi</span>
      </div>

      {visibleItems.length ? (
        <div className="product-documentation-list">
          {visibleItems.map((item) => (
            <article
              className="product-documentation-entry panel"
              key={item.id}
            >
              <header>
                <div>
                  <p className="eyebrow">PRODUK</p>
                  <h2>{item.productName}</h2>
                </div>
                {isAdmin && (
                  <div className="product-documentation-entry-actions">
                    <button
                      className="button-secondary"
                      onClick={() => openForm(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => void remove(item)}
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </header>
              <details className="product-documentation-disclosure">
                <summary>
                  <span>Baca dokumentasi</span>
                  <small>
                    {item.hasDipSwitch
                      ? `${item.dipSwitches.length} baris pengaturan`
                      : "Tanpa tabel pengaturan"}
                  </small>
                </summary>
                <div className="product-documentation-content">
                  <p className="product-documentation-description">
                    {item.description}
                  </p>
                  <section className="product-documentation-dip">
                    <h3>{item.sectionTitle || "DIP Switch"}</h3>
                    {item.hasDipSwitch && item.dipSwitches.length ? (
                      <div className="dip-switch-table-wrap">
                        <table className="dip-switch-table">
                          <thead>
                            <tr>
                              <th>{item.firstColumnTitle || "Nomor DIP"}</th>
                              <th>Penjelasan kegunaan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.dipSwitches.map((setting, index) => (
                              <tr key={`${setting.dipNumber}-${index}`}>
                                <td>{setting.dipNumber}</td>
                                <td>{setting.purpose}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="product-documentation-no-dip">
                        Produk ini tidak memiliki tabel pengaturan.
                      </p>
                    )}
                  </section>
                </div>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state product-documentation-empty">
          <h3>
            {items.length
              ? "Dokumentasi tidak ditemukan"
              : "Belum ada dokumentasi produk"}
          </h3>
          <p>
            {items.length
              ? "Coba kata kunci produk atau pengaturan yang lain."
              : isAdmin
                ? "Tambahkan dokumentasi pertama untuk mulai mencatat pengaturan produk."
                : "Dokumentasi produk belum tersedia."}
          </p>
        </div>
      )}
    </div>
  );
}
