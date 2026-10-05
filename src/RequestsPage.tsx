import { useState, type FormEvent } from "react";
import type { RequestStatus, TeamRequest } from "./lib/supabase";

type Props = {
  items: TeamRequest[];
  isAdmin: boolean;
  canSubmit: boolean;
  onCreate: (title: string, description: string) => Promise<void>;
  onSetStatus: (
    request: TeamRequest,
    status: RequestStatus,
    rejectionReason?: string,
  ) => Promise<void>;
};

const statusLabels: Record<RequestStatus, string> = {
  pending: "Menunggu",
  in_progress: "Diproses",
  rejected: "Tidak diterima",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RequestsPage({
  items,
  isAdmin,
  canSubmit,
  onCreate,
  onSetStatus,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setNotice("");
    setSubmitting(true);
    try {
      await onCreate(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setNotice("Permintaan berhasil dikirim dan dapat dilihat semua tim.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Permintaan tidak dapat dikirim.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const acceptRequest = async (request: TeamRequest) => {
    setActionError("");
    try {
      await onSetStatus(request, "in_progress");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Permintaan tidak dapat diproses.",
      );
    }
  };

  const finishRequest = async (
    request: TeamRequest,
    status: "completed" | "cancelled",
  ) => {
    setActionError("");
    try {
      await onSetStatus(request, status);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Status permintaan tidak dapat diperbarui.",
      );
    }
  };

  const rejectRequest = async (
    event: FormEvent<HTMLFormElement>,
    request: TeamRequest,
  ) => {
    event.preventDefault();
    setActionError("");
    try {
      await onSetStatus(request, "rejected", rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason("");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Permintaan tidak dapat ditolak.",
      );
    }
  };

  return (
    <div className="page-content inner-page requests-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">RUANG KERJA TIM</p>
          <h1>Permintaan</h1>
          <p className="welcome-copy">
            Pertanyaan dan kebutuhan sales yang dapat dilihat bersama.
          </p>
        </div>
        <span className="requests-count">{items.length} permintaan</span>
      </div>

      {canSubmit && (
        <form className="request-form panel" onSubmit={submitRequest}>
          <div className="form-heading">
            <div>
              <h2>Buat permintaan</h2>
              <p>
                Pertanyaan ini akan terlihat oleh seluruh tim sales dan admin.
              </p>
            </div>
          </div>
          <div className="request-form-fields">
            <label className="field-label">
              Judul
              <input
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Tulis pertanyaan atau kebutuhan"
              />
            </label>
            <label className="field-label">
              Penjelasan
              <textarea
                required
                maxLength={5000}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Berikan detail agar tim dapat memahami permintaan"
              />
            </label>
          </div>
          {formError && (
            <p className="request-error" role="alert">
              {formError}
            </p>
          )}
          {notice && (
            <p className="request-notice" role="status">
              {notice}
            </p>
          )}
          <div className="request-form-actions">
            <button
              className="button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Mengirim..." : "Kirim permintaan"}
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <p className="request-error" role="alert">
          {actionError}
        </p>
      )}

      {items.length ? (
        <div className="request-list">
          {items.map((request) => (
            <article className="request-item panel" key={request.id}>
              <header className="request-item-header">
                <div className="request-item-title">
                  <span
                    className={`request-status request-status-${request.status}`}
                  >
                    {statusLabels[request.status]}
                  </span>
                  <h2>{request.title}</h2>
                </div>
                <div className="request-meta">
                  <span>{request.createdByName}</span>
                  <time dateTime={request.createdAt}>
                    {formatDate(request.createdAt)}
                  </time>
                </div>
              </header>
              <p className="request-description">{request.description}</p>

              {request.status === "rejected" && request.rejectionReason && (
                <div className="request-rejection-reason">
                  <strong>Alasan tidak diterima</strong>
                  <p>{request.rejectionReason}</p>
                </div>
              )}

              {isAdmin && request.status === "pending" && (
                <div className="request-admin-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() => void acceptRequest(request)}
                  >
                    Terima &amp; proses
                  </button>
                  <button
                    className="button-danger"
                    type="button"
                    onClick={() => {
                      setActionError("");
                      setRejectingId(request.id);
                      setRejectionReason("");
                    }}
                  >
                    Tidak diterima
                  </button>
                </div>
              )}

              {isAdmin && request.status === "in_progress" && (
                <div className="request-admin-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() => void finishRequest(request, "completed")}
                  >
                    Selesai
                  </button>
                  <button
                    className="button-danger"
                    type="button"
                    onClick={() => void finishRequest(request, "cancelled")}
                  >
                    Batalkan
                  </button>
                </div>
              )}

              {isAdmin && rejectingId === request.id && (
                <form
                  className="request-rejection-form"
                  onSubmit={(event) => void rejectRequest(event, request)}
                >
                  <label className="field-label">
                    Alasan tidak diterima
                    <textarea
                      autoFocus
                      required
                      maxLength={1000}
                      rows={3}
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(event.target.value)
                      }
                      placeholder="Jelaskan alasan permintaan tidak diterima"
                    />
                  </label>
                  <div className="request-form-actions">
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => setRejectingId(null)}
                    >
                      Batal
                    </button>
                    <button className="button-danger" type="submit">
                      Simpan alasan
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state request-empty-state">
          <h3>Belum ada permintaan</h3>
          <p>
            {canSubmit
              ? "Permintaan yang dikirim akan muncul di sini untuk seluruh tim."
              : "Permintaan dari sales akan muncul di sini."}
          </p>
        </div>
      )}
    </div>
  );
}
